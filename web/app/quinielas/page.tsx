"use client";

import Link from "next/link";
import { Link2, Plus, Users } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import type { QuinielaType } from "@/lib/types";

export default function QuinielasPage() {
  const { user } = useAuth();
  const {
    getMyQuinielas,
    requestJoinQuiniela,
    createQuiniela,
    tournaments,
    rounds,
    predictions,
    isLoading,
  } = useApp();
  const myQuinielas = getMyQuinielas();

  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    organizerName: user?.username ?? "",
    tournamentId: "",
    roundId: "",
    quinielaType: "amigos" as QuinielaType,
    rules: "",
  });

  const availableRounds = useMemo(
    () => rounds.filter((r) => r.tournamentId === form.tournamentId && !r.isClosed),
    [rounds, form.tournamentId],
  );

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const q = await requestJoinQuiniela(code);
      if (!q) setMsg("Código inválido o quiniela no activa.");
      else {
        setJoinOpen(false);
        setCode("");
        setMsg(`Entraste a "${q.name}".`);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al unirse");
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const tournament = tournaments.find((t) => t.id === form.tournamentId);
    if (!tournament || !form.roundId || !form.name.trim()) {
      setMsg("Completa nombre, liga y jornada.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await createQuiniela({
        name: form.name.trim(),
        organizerName: form.organizerName.trim() || user?.username || "Organizador",
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        roundId: form.roundId,
        quinielaType: form.quinielaType,
        rules: form.rules.trim() || undefined,
      });
      setCreateOpen(false);
      setForm({ ...form, name: "", rules: "" });
      setMsg("Quiniela creada (queda pendiente de validación/activación del admin).");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mis Quinielas</h1>
          <p className="text-sm text-[var(--muted)]">Modo fácil: gana · empate · pierde (1 pt)</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" type="button" onClick={() => setJoinOpen(true)}>
            <Link2 size={16} /> Unirse
          </button>
          <button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Crear
          </button>
        </div>
      </div>

      {msg && (
        <p className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-3 text-sm">
          {msg}
        </p>
      )}

      {isLoading ? (
        <p className="text-[var(--muted)]">Cargando…</p>
      ) : myQuinielas.length === 0 ? (
        <div className="card p-8 text-center text-[var(--muted)]">
          Aún no tienes quinielas. Únete con un código o crea una.
        </div>
      ) : (
        <div className="grid gap-3">
          {myQuinielas.map((q) => {
            const pts = predictions
              .filter(
                (p) =>
                  p.quinielaId === q.id &&
                  p.userId === user?.id &&
                  p.isCalculated === true,
              )
              .reduce((acc, p) => acc + (p.pointsEarned ?? 0), 0);
            const memberCount = q.participants.filter(
              (p) => p.status === "confirmado" || p.status === "pendiente",
            ).length;
            return (
              <Link key={q.id} href={`/quiniela/${q.id}`} className="card block p-4 hover:border-[var(--primary)]/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{q.name}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {q.tournamentName} · {q.status} · código {q.code}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="rounded-lg bg-[var(--elevated)] px-3 py-1 text-sm font-semibold text-[var(--primary)]">
                      {pts} pts
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                      <Users size={12} />
                      {memberCount} {memberCount === 1 ? "jugador" : "jugadores"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {joinOpen && (
        <Modal title="Unirse con código" onClose={() => setJoinOpen(false)}>
          <form onSubmit={join} className="space-y-3">
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              required
            />
            <button className="btn btn-primary w-full" disabled={busy} type="submit">
              Entrar
            </button>
          </form>
        </Modal>
      )}

      {createOpen && (
        <Modal title="Crear quiniela" onClose={() => setCreateOpen(false)}>
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Liga</label>
              <select
                className="input"
                value={form.tournamentId}
                onChange={(e) => setForm({ ...form, tournamentId: e.target.value, roundId: "" })}
                required
              >
                <option value="">Selecciona…</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.season}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Jornada</label>
              <select
                className="input"
                value={form.roundId}
                onChange={(e) => setForm({ ...form, roundId: e.target.value })}
                required
              >
                <option value="">Selecciona…</option>
                {availableRounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary w-full" disabled={busy} type="submit">
              Crear (modo fácil)
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" className="text-[var(--muted)]" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
