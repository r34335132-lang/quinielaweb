"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { TeamBadge } from "@/components/TeamBadge";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import { inviteUrl } from "@/lib/mappers";
import type { WinnerPick } from "@/lib/types";

export default function QuinielaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, users } = useAuth();
  const {
    quinielas,
    matches,
    teams,
    rounds,
    predictions,
    getLeaderboard,
    savePrediction,
  } = useApp();
  const quiniela = quinielas.find((q) => q.id === id);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState("");

  const selectedRound = useMemo(
    () => rounds.find((r) => r.id === quiniela?.roundId),
    [rounds, quiniela?.roundId],
  );
  const roundMatches = useMemo(
    () => (selectedRound ? matches.filter((m) => m.roundId === selectedRound.id) : []),
    [matches, selectedRound],
  );
  const leaderboard = useMemo(() => {
    if (!quiniela) return [];
    return getLeaderboard(quiniela.id).filter((e) =>
      quiniela.participants.some((p) => p.userId === e.userId && p.status === "confirmado"),
    );
  }, [quiniela, getLeaderboard]);

  if (!quiniela) {
    return <p className="text-[var(--muted)]">Quiniela no encontrada.</p>;
  }

  const url = inviteUrl(quiniela.code);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const pick = async (matchId: string, winner: WinnerPick) => {
    setSavingId(matchId);
    setFlash("");
    try {
      await savePrediction({ matchId, quinielaId: quiniela.id, winner });
      setFlash("Pronóstico guardado");
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{quiniela.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            {quiniela.participants.filter((p) => p.status === "confirmado").length} participantes ·{" "}
            {selectedRound?.name ?? "Sin jornada"}
          </p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={copy}>
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          {copied ? "Copiado" : "Compartir link"}
        </button>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <Copy size={16} className="text-[var(--primary)]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--muted)]">Link de invitación · Quiniela fácil (1 pt)</p>
          <p className="truncate font-semibold text-[var(--primary)]">{url}</p>
          <p className="text-xs text-[var(--muted)]">Código: {quiniela.code}</p>
        </div>
      </div>

      {flash && (
        <p className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-2 text-sm text-[var(--success)]">
          {flash}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Ranking</h2>
        <div className="space-y-2">
          {leaderboard.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Aún no hay puntos calculados.</p>
          )}
          {leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`card flex items-center gap-3 px-4 py-3 ${
                entry.userId === user?.id ? "border-[var(--primary)]/50 bg-[var(--primary)]/10" : ""
              }`}
            >
              <span className="w-8 font-bold text-[var(--muted)]">#{entry.rank}</span>
              <span className="flex-1 font-semibold">
                {entry.username}
                {entry.userId === user?.id ? " (Tú)" : ""}
              </span>
              <span className="text-sm text-[var(--muted)]">{entry.correctPredictions} aciertos</span>
              <span className="font-bold text-[var(--primary)]">{entry.totalPoints} pts</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Partidos · ¿Quién gana?</h2>
        <div className="space-y-4">
          {roundMatches.map((match) => {
            const home = teams.find((t) => t.id === match.homeTeamId);
            const away = teams.find((t) => t.id === match.awayTeamId);
            if (!home || !away) return null;
            const myPred = predictions.find(
              (p) =>
                p.matchId === match.id &&
                p.quinielaId === quiniela.id &&
                p.userId === user?.id,
            );
            const locked = ["live", "finished", "cancelled"].includes(match.status);
            const groupPreds = predictions.filter(
              (p) => p.matchId === match.id && p.quinielaId === quiniela.id,
            );
            const actual: WinnerPick | undefined =
              match.status === "finished" &&
              match.homeScore !== undefined &&
              match.awayScore !== undefined
                ? match.homeScore > match.awayScore
                  ? "home"
                  : match.awayScore > match.homeScore
                    ? "away"
                    : "draw"
                : undefined;

            const choices: { value: WinnerPick; label: string; color: string }[] = [
              { value: "home", label: `Gana ${home.shortName}`, color: home.primaryColor },
              { value: "draw", label: "Empate", color: "#FFB800" },
              { value: "away", label: `Gana ${away.shortName}`, color: away.primaryColor },
            ];

            return (
              <div key={match.id} className="card space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <TeamBadge team={home} size={48} />
                    <span className="text-center text-sm font-semibold">{home.name}</span>
                  </div>
                  <div className="text-center">
                    {match.status === "finished" ? (
                      <p className="text-2xl font-bold">
                        {match.homeScore} - {match.awayScore}
                      </p>
                    ) : (
                      <p className="text-lg font-bold text-[var(--muted)]">VS</p>
                    )}
                    <p className="text-xs text-[var(--muted)]">
                      {match.date} {match.time}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <TeamBadge team={away} size={48} />
                    <span className="text-center text-sm font-semibold">{away.name}</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  {choices.map((c) => {
                    const selected = myPred?.winner === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        disabled={locked || savingId === match.id}
                        onClick={() => pick(match.id, c.value)}
                        className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-semibold disabled:opacity-50"
                        style={{
                          borderColor: selected ? c.color : "var(--border)",
                          background: selected ? `${c.color}22` : "var(--elevated)",
                          color: selected ? c.color : "var(--text)",
                        }}
                      >
                        {c.label}
                        {selected && <Check size={16} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {myPred?.isCalculated && (
                  <p className="text-sm text-[var(--muted)]">
                    Tus puntos en este partido:{" "}
                    <strong className="text-[var(--primary)]">+{myPred.pointsEarned ?? 0}</strong>
                  </p>
                )}

                <div className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-3">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold">Elecciones del grupo</span>
                    <span className="text-[var(--muted)]">
                      {groupPreds.length}/
                      {quiniela.participants.filter((p) => p.status === "confirmado").length}
                    </span>
                  </div>
                  {!locked ? (
                    <p className="text-sm text-[var(--muted)]">
                      Se revelan cuando inicie el partido.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {groupPreds.map((p) => {
                        const name =
                          users.find((u) => u.id === p.userId)?.username ?? "Participante";
                        const label =
                          p.winner === "home"
                            ? home.name
                            : p.winner === "away"
                              ? away.name
                              : p.winner === "draw"
                                ? "Empate"
                                : "—";
                        const ok = actual && p.winner === actual;
                        return (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span>{name}</span>
                            <span className={ok ? "text-[var(--success)]" : "text-[var(--muted)]"}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                      {actual && (
                        <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                          Resultado:{" "}
                          {actual === "home"
                            ? home.name
                            : actual === "away"
                              ? away.name
                              : "Empate"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {roundMatches.length === 0 && (
            <p className="text-[var(--muted)]">No hay partidos en esta jornada.</p>
          )}
        </div>
      </section>
    </div>
  );
}
