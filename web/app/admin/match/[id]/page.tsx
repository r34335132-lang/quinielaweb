"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { TeamBadge } from "@/components/TeamBadge";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import type { Match } from "@/lib/types";

export default function AdminMatchResultPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { matches, teams, updateMatchResult, recalculatePoints } = useApp();
  const router = useRouter();
  const match = matches.find((m) => m.id === id);
  const home = match ? teams.find((t) => t.id === match.homeTeamId) : undefined;
  const away = match ? teams.find((t) => t.id === match.awayTeamId) : undefined;

  const [status, setStatus] = useState<Match["status"]>(match?.status ?? "pending");
  const [homeScore, setHomeScore] = useState(match?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match?.awayScore ?? 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (user?.role !== "administrador") {
    return <p className="text-[var(--muted)]">Acceso solo admin.</p>;
  }
  if (!match || !home || !away) {
    return <p className="text-[var(--muted)]">Partido no encontrado.</p>;
  }

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await updateMatchResult(match.id, { status, homeScore, awayScore });
      if (status === "finished") {
        await recalculatePoints(match.id);
        setMsg("Resultado guardado y puntos recalculados (1 pt por acierto).");
      } else {
        setMsg("Partido actualizado.");
      }
      setTimeout(() => router.push("/admin"), 800);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <ArrowLeft size={16} /> Admin
      </Link>
      <h1 className="text-2xl font-bold">Capturar resultado</h1>

      <div className="card flex items-center justify-between gap-4 p-5">
        <div className="flex flex-col items-center gap-2">
          <TeamBadge team={home} size={56} />
          <span className="font-semibold">{home.name}</span>
        </div>
        <span className="text-[var(--muted)]">
          {match.date} {match.time}
        </span>
        <div className="flex flex-col items-center gap-2">
          <TeamBadge team={away} size={56} />
          <span className="font-semibold">{away.name}</span>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Estado</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as Match["status"])}
          >
            <option value="pending">Pendiente</option>
            <option value="live">En vivo</option>
            <option value="finished">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stepper label={home.shortName} value={homeScore} onChange={setHomeScore} />
          <Stepper label={away.shortName} value={awayScore} onChange={setAwayScore} />
        </div>
        <p className="text-sm text-[var(--muted)]">
          Resultado 1X2:{" "}
          <strong className="text-[var(--text)]">
            {homeScore > awayScore
              ? `Gana ${home.shortName}`
              : awayScore > homeScore
                ? `Gana ${away.shortName}`
                : "Empate"}
          </strong>
        </p>
        <button className="btn btn-primary w-full" disabled={busy} type="button" onClick={save}>
          Guardar y sumar puntos
        </button>
        {msg && <p className="text-sm text-[var(--success)]">{msg}</p>}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-[var(--muted)]">{label}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          className="btn btn-ghost h-10 w-10 p-0"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </button>
        <span className="w-10 text-2xl font-bold">{value}</span>
        <button
          type="button"
          className="btn btn-ghost h-10 w-10 p-0"
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
