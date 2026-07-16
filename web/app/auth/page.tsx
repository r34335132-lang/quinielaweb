"use client";

import { Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/context/AuthProvider";
import { hasSupabaseConfig, SUPABASE_CONFIG_ERROR } from "@/lib/supabase";

export default function AuthPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configOk = hasSupabaseConfig();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!configOk) {
      setError(SUPABASE_CONFIG_ERROR);
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (!result.ok) {
          setError(result.message ?? "No se pudo iniciar sesión");
          return;
        }
      } else {
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres");
          return;
        }
        const result = await register(username, email, password);
        if (!result.ok) {
          setError(result.message ?? "No se pudo registrar");
          return;
        }
        if (result.needsEmailConfirmation) {
          setError(result.message ?? "Confirma tu correo e inicia sesión.");
          setMode("login");
          return;
        }
      }
      const pending = localStorage.getItem("quiniela_pending_invite");
      if (pending) router.replace(`/join/${pending}`);
      else router.replace("/quinielas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)]">
            <Target size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Quiniela Deportiva</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Predicciones sociales · Sin apuestas</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-[var(--elevated)] p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-sm font-semibold ${
                mode === m ? "bg-[var(--primary)] text-[var(--primary-fg)]" : "text-[var(--muted)]"
              }`}
            >
              {m === "login" ? "Entrar" : "Registrarme"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="label">Usuario</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu apodo"
                required
              />
            </div>
          )}
          <div>
            <label className="label">Correo</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {(!configOk || error) && (
            <p className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {!configOk ? SUPABASE_CONFIG_ERROR : error}
            </p>
          )}
          <button className="btn btn-primary w-full" disabled={loading || !configOk} type="submit">
            {loading ? "Espera…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
