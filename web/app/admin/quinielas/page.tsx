"use client";

import Link from "next/link";
import { ArrowLeft, Link2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import { inviteUrl } from "@/lib/mappers";
import type { QuinielaStatus } from "@/lib/types";

const TABS: QuinielaStatus[] = ["pendiente", "activa", "finalizada", "rechazada"];

export default function AdminQuinielasPage() {
  const { user, users } = useAuth();
  const {
    quinielas,
    validateQuiniela,
    activateQuiniela,
    rejectQuiniela,
    deactivateQuiniela,
    confirmParticipant,
    rejectParticipant,
  } = useApp();
  const [tab, setTab] = useState<QuinielaStatus>("pendiente");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const filtered = useMemo(
    () => quinielas.filter((q) => q.status === tab),
    [quinielas, tab],
  );

  if (user?.role !== "administrador") {
    return <p className="text-[var(--muted)]">Acceso solo admin.</p>;
  }

  return (
    <div className="space-y-5">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <ArrowLeft size={16} /> Admin
      </Link>
      <h1 className="text-2xl font-bold">Quinielas — Admin</h1>
      {msg && <p className="text-sm text-[var(--primary)]">{msg}</p>}

      <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === t ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--muted)]"
            }`}
          >
            {t} ({quinielas.filter((q) => q.status === t).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-[var(--muted)]">No hay quinielas en este estado.</p>
        )}
        {filtered.map((q) => (
          <div key={q.id} className="card p-4">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setExpanded(expanded === q.id ? null : q.id)}
            >
              <p className="font-bold">{q.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {q.organizerName} · {q.tournamentName} · Fácil 1X2
              </p>
            </button>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--primary)]"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl(q.code));
                setMsg(`Link copiado: ${inviteUrl(q.code)}`);
              }}
            >
              <Link2 size={14} />
              {inviteUrl(q.code)}
            </button>

            {expanded === q.id && (
              <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                <div className="flex flex-wrap gap-2">
                  <Action
                    label="Validar"
                    onClick={() => validateQuiniela(q.id).then(() => setMsg("Validada"))}
                  />
                  <Action
                    label="Activar"
                    onClick={() => activateQuiniela(q.id).then(() => setMsg("Activada"))}
                  />
                  <Action
                    label="Rechazar"
                    onClick={() => rejectQuiniela(q.id).then(() => setMsg("Rechazada"))}
                  />
                  <Action
                    label="Desactivar"
                    onClick={() => deactivateQuiniela(q.id).then(() => setMsg("Desactivada"))}
                  />
                </div>
                <p className="font-semibold">Participantes</p>
                {q.participants.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between gap-2 border-b border-[var(--border)] py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {users.find((u) => u.id === p.userId)?.username ?? p.userId}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{p.status}</p>
                    </div>
                    {p.status === "pendiente" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost py-1 text-xs"
                          onClick={() => confirmParticipant(q.id, p.userId)}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost py-1 text-xs"
                          onClick={() => rejectParticipant(q.id, p.userId)}
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-ghost py-2 text-xs" onClick={onClick}>
      {label}
    </button>
  );
}
