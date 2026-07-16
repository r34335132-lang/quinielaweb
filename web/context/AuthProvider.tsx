"use client";

import type { Session } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { mapUser } from "@/lib/mappers";
import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

interface AuthResult {
  ok: boolean;
  message?: string;
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  user: User | null;
  users: User[];
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (username: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readableError(error: unknown): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : String(error ?? "");
  if (raw === "Invalid login credentials") return "Correo o contraseña incorrectos.";
  if (raw.toLowerCase().includes("already registered"))
    return "Este correo ya está registrado.";
  return raw.length > 200 ? "No se pudo completar la operación." : raw;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ensureProfile = useCallback(async (authUser: Session["user"]) => {
    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) return existing;
    const username = String(
      authUser.user_metadata?.username || authUser.email?.split("@")[0] || "usuario",
    ).trim();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: authUser.id, username, email: authUser.email ?? null }, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const refreshUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("total_points", { ascending: false });
    if (error) throw error;
    const mapped = (data ?? []).map(mapUser);
    setUsers(mapped);
    setUser((current) =>
      current ? mapped.find((item) => item.id === current.id) ?? current : current,
    );
  }, []);

  const loadSession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setUser(null);
        setUsers([]);
        setIsLoading(false);
        return;
      }
      const data = await ensureProfile(nextSession.user);
      setUser(mapUser(data));
      await refreshUsers();
      setIsLoading(false);
    },
    [ensureProfile, refreshUsers],
  );

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => loadSession(data.session))
      .catch(() => setIsLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => loadSession(nextSession).catch(() => setIsLoading(false)), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { ok: false, message: readableError(error) };
      try {
        await ensureProfile(data.user);
      } catch (profileError) {
        await supabase.auth.signOut();
        return {
          ok: false,
          message: `Cuenta sin perfil: ${profileError instanceof Error ? profileError.message : "error"}`,
        };
      }
      return { ok: true };
    },
    [ensureProfile],
  );

  const register = useCallback(async (username: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { username: username.trim() } },
    });
    if (error) return { ok: false, message: readableError(error) };
    if (!data.session) {
      return {
        ok: true,
        needsEmailConfirmation: true,
        message: "Revisa tu correo para confirmar la cuenta.",
      };
    }
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, users, session, isLoading, login, register, logout, refreshUsers }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
