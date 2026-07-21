"use client";

import { Check, Copy, Lock, Share2, Users, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { TeamBadge } from "@/components/TeamBadge";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import { inviteUrl } from "@/lib/mappers";
import { formatLockLabel, isMatchLocked } from "@/lib/match";
import { matchActualWinner } from "@/lib/scoring";
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const roundsWithMatches = useMemo(() => {
    if (!quiniela) return [];
    return rounds
      .filter((r) => r.tournamentId === quiniela.tournamentId)
      .sort((a, b) => a.number - b.number)
      .map((round) => ({
        round,
        matches: matches
          .filter((m) => m.roundId === round.id)
          .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
      }));
  }, [quiniela, rounds, matches]);
  const totalMatches = useMemo(
    () => roundsWithMatches.reduce((acc, item) => acc + item.matches.length, 0),
    [roundsWithMatches],
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
  const members = quiniela.participants.filter(
    (p) => p.status === "confirmado" || p.status === "pendiente",
  );
  const memberRows = members.map((p) => ({
    userId: p.userId,
    username: users.find((u) => u.id === p.userId)?.username ?? "Participante",
    status: p.status,
  }));

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

  const pickLabel = (winner: WinnerPick | undefined, homeName: string, awayName: string) => {
    if (winner === "home") return homeName;
    if (winner === "away") return awayName;
    if (winner === "draw") return "Empate";
    return "Sin elegir";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{quiniela.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            {quiniela.tournamentName ?? "Liga"} · Todas las jornadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/15 px-3 py-2 text-sm font-semibold text-[var(--primary)]">
            <Users size={15} />
            {members.length} {members.length === 1 ? "participante" : "participantes"}
          </span>
          <button className="btn btn-ghost" type="button" onClick={copy}>
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? "Copiado" : "Compartir link"}
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <Copy size={16} className="text-[var(--primary)]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--muted)]">Link de invitación · Quiniela fácil (1 pt)</p>
          <p className="truncate font-semibold text-[var(--primary)]">{url}</p>
          <p className="text-xs text-[var(--muted)]">Código: {quiniela.code}</p>
        </div>
      </div>

      <section className="card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Users size={16} className="text-[var(--primary)]" />
          <h2 className="font-bold">Quiénes están jugando ({members.length})</h2>
        </div>
        {memberRows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Aún no hay participantes. Comparte el link para invitar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {memberRows.map((m) => (
              <span
                key={m.userId}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  m.userId === user?.id
                    ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                    : "bg-[var(--elevated)] text-[var(--text)]"
                }`}
              >
                {m.username}
                {m.userId === user?.id ? " (Tú)" : ""}
                {m.status === "pendiente" ? " · pendiente" : ""}
              </span>
            ))}
          </div>
        )}
      </section>

      {flash && (
        <p className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-2 text-sm text-[var(--success)]">
          {flash}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Ranking</h2>
        <div className="space-y-2">
          {leaderboard.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              Los puntos aparecen cuando el admin captura el resultado de cada partido.
            </p>
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
        <div className="space-y-8">
          {roundsWithMatches.map(({ round, matches: roundMatches }) => (
            <div key={round.id} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold">{round.name}</h3>
                <span className="text-xs text-[var(--muted)]">
                  {roundMatches.length} {roundMatches.length === 1 ? "partido" : "partidos"}
                </span>
              </div>
              {roundMatches.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No hay partidos en esta jornada.</p>
              ) : (
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
            const locked = isMatchLocked(match, now);
            const finished = match.status === "finished";
            const groupPreds = predictions.filter(
              (p) => p.matchId === match.id && p.quinielaId === quiniela.id,
            );
            const actual = matchActualWinner(match);
            const myOk = finished && actual && myPred?.winner ? myPred.winner === actual : undefined;

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
                    {finished ? (
                      <p className="text-2xl font-bold">
                        {match.homeScore} - {match.awayScore}
                      </p>
                    ) : (
                      <p className="text-lg font-bold text-[var(--muted)]">VS</p>
                    )}
                    <p className="text-xs text-[var(--muted)]">
                      {match.date} {match.time}
                    </p>
                    <p
                      className={`mt-1 flex items-center justify-center gap-1 text-xs font-semibold ${
                        locked ? "text-[var(--danger)]" : "text-[var(--warning)]"
                      }`}
                    >
                      {locked && <Lock size={11} />}
                      {formatLockLabel(match, now)}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <TeamBadge team={away} size={48} />
                    <span className="text-center text-sm font-semibold">{away.name}</span>
                  </div>
                </div>

                {finished && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      myOk === true
                        ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
                        : myOk === false
                          ? "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]"
                          : "border-[var(--border)] bg-[var(--elevated)] text-[var(--muted)]"
                    }`}
                  >
                    <p className="font-semibold">
                      {myOk === true
                        ? "¡Acertaste!"
                        : myOk === false
                          ? "No acertaste"
                          : "Sin pronóstico"}
                    </p>
                    <p className="mt-1">
                      Elegiste:{" "}
                      <strong>{pickLabel(myPred?.winner, home.name, away.name)}</strong>
                      {" · "}
                      Resultado:{" "}
                      <strong>
                        {actual
                          ? pickLabel(actual, home.name, away.name)
                          : "—"}
                      </strong>
                    </p>
                    {myPred?.isCalculated && (
                      <p className="mt-1 font-bold">
                        +{myPred.pointsEarned ?? 0} pts
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-2">
                  {choices.map((c) => {
                    const selected = myPred?.winner === c.value;
                    const showResult = finished && selected && actual !== undefined;
                    const isCorrect = showResult && c.value === actual;
                    const isWrong = showResult && c.value !== actual;
                    const borderColor = isCorrect
                      ? "var(--success)"
                      : isWrong
                        ? "var(--danger)"
                        : selected
                          ? c.color
                          : "var(--border)";
                    const bg = isCorrect
                      ? "color-mix(in srgb, var(--success) 18%, transparent)"
                      : isWrong
                        ? "color-mix(in srgb, var(--danger) 18%, transparent)"
                        : selected
                          ? `${c.color}22`
                          : "var(--elevated)";
                    const textColor = isCorrect
                      ? "var(--success)"
                      : isWrong
                        ? "var(--danger)"
                        : selected
                          ? c.color
                          : "var(--text)";

                    return (
                      <button
                        key={c.value}
                        type="button"
                        disabled={locked || savingId === match.id || finished}
                        onClick={() => pick(match.id, c.value)}
                        className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-semibold disabled:opacity-50"
                        style={{
                          borderColor,
                          background: bg,
                          color: textColor,
                        }}
                      >
                        {c.label}
                        {isCorrect && <Check size={16} className="ml-auto" />}
                        {isWrong && <X size={16} className="ml-auto" />}
                        {!finished && selected && <Check size={16} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {!finished && myPred?.winner && (
                  <p className="text-sm text-[var(--muted)]">
                    Tu elección:{" "}
                    <strong className="text-[var(--text)]">
                      {pickLabel(myPred.winner, home.name, away.name)}
                    </strong>
                    . Los puntos se muestran cuando termine el partido.
                  </p>
                )}

                <div className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-3">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold">Elecciones del grupo</span>
                    <span className="text-[var(--muted)]">
                      {groupPreds.length}/{members.length}
                    </span>
                  </div>
                  {!finished ? (
                    <p className="text-sm text-[var(--muted)]">
                      Se revelan cuando el partido termine y el admin capture el resultado.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {groupPreds.map((p) => {
                        const name =
                          users.find((u) => u.id === p.userId)?.username ?? "Participante";
                        const label = pickLabel(p.winner, home.name, away.name);
                        const ok = actual && p.winner === actual;
                        const pts =
                          p.isCalculated && p.pointsEarned !== undefined
                            ? ` · +${p.pointsEarned}`
                            : "";
                        return (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span>{name}</span>
                            <span
                              className={
                                ok ? "font-semibold text-[var(--success)]" : "text-[var(--danger)]"
                              }
                            >
                              {label}
                              {ok ? " ✓" : " ✗"}
                              {pts}
                            </span>
                          </div>
                        );
                      })}
                      {actual && (
                        <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                          Resultado oficial: {pickLabel(actual, home.name, away.name)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
                </div>
              )}
            </div>
          ))}
          {totalMatches === 0 && (
            <p className="text-[var(--muted)]">No hay partidos en esta liga.</p>
          )}
        </div>
      </section>
    </div>
  );
}
