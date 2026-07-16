"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").trim().toUpperCase();
  const { user, isLoading: authLoading } = useAuth();
  const { requestJoinQuiniela, isLoading: appLoading, getMyQuinielas } = useApp();
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState("Preparando invitación…");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      setMessage("Enlace inválido.");
      return;
    }
    if (authLoading || appLoading) return;

    if (!user) {
      localStorage.setItem("quiniela_pending_invite", code);
      setMessage("Inicia sesión o regístrate para unirte.");
      return;
    }

    if (started.current) return;
    started.current = true;

    const already = getMyQuinielas().find(
      (q) =>
        q.code.toUpperCase() === code &&
        q.participants.some((p) => p.userId === user.id && p.status === "confirmado"),
    );
    if (already) {
      localStorage.removeItem("quiniela_pending_invite");
      setMessage(`Ya eres parte de "${already.name}".`);
      setTimeout(() => router.replace(`/quiniela/${already.id}`), 700);
      return;
    }

    (async () => {
      try {
        setMessage("Uniéndote a la quiniela…");
        const quiniela = await requestJoinQuiniela(code);
        localStorage.removeItem("quiniela_pending_invite");
        if (!quiniela) {
          setError(true);
          setMessage("No hay una quiniela activa con ese código.");
          return;
        }
        setMessage(`¡Listo! Entraste a "${quiniela.name}".`);
        setTimeout(() => router.replace(`/quiniela/${quiniela.id}`), 700);
      } catch (err) {
        setError(true);
        setMessage(err instanceof Error ? err.message : "No se pudo unir");
      }
    })();
  }, [code, user, authLoading, appLoading, getMyQuinielas, requestJoinQuiniela, router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <div className="card w-full space-y-3 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)]">
          <Link2 />
        </div>
        <h1 className="text-xl font-bold">Invitación</h1>
        <p className="text-2xl font-bold tracking-[0.2em] text-[var(--primary)]">{code || "—"}</p>
        <p className="text-sm text-[var(--muted)]">{message}</p>
        {!user && !authLoading && (
          <Link href="/auth" className="btn btn-primary mt-2 w-full">
            Entrar / Registrarme
          </Link>
        )}
        {error && (
          <Link href="/quinielas" className="btn btn-ghost mt-2 w-full">
            Ir a Mis Quinielas
          </Link>
        )}
      </div>
    </div>
  );
}
