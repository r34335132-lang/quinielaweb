"use client";

import { Check, Copy, Lock, Share2, Trophy, Users, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { TeamBadge } from "@/components/TeamBadge";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import { inviteUrl, buildLeaderboard } from "@/lib/mappers";
import { formatLockLabel, isMatchLocked } from "@/lib/match";
import { matchActualWinner } from "@/lib/scoring";
import type { LeaderboardEntry, Match, Round, Team, WinnerPick } from "@/lib/types";

type Tab = "pronosticos" | "ranking";

export default function QuinielaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, users } = useAuth();
  const {
    quinielas,
    matches,
    teams,
    rounds,
    predictions,
    savePrediction,
  } = useApp();
  const quiniela = quinielas.find((q) => q.id === id);
  const [tab, setTab] = useState<Tab>("pronosticos");
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const tournamentRounds = useMemo(() => {
    if (!quiniela) return [];
    return rounds
      .filter((r) => r.tournamentId === quiniela.tournamentId)
      .sort((a, b) => a.number - b.number);
  }, [quiniela, rounds]);

  const roundsWithMatches = useMemo(() => {
    return tournamentRounds.map((round) => ({
      round,
      matches: matches
        .filter((m) => m.roundId === round.id)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    }));
  }, [tournamentRounds, matches]);

  useEffect(() => {
    if (selectedRoundId) return;
    const firstWithMatches = roundsWithMatches.find((r) => r.matches.length > 0);
    const fallback = roundsWithMatches[0]?.round.id ?? "";
    setSelectedRoundId(firstWithMatches?.round.id ?? fallback);
  }, [roundsWithMatches, selectedRoundId]);

  const selectedRoundMatches = useMemo(() => {
    const item = roundsWithMatches.find((r) => r.round.id === selectedRoundId);
    return item?.matches ?? [];
  }, [roundsWithMatches, selectedRoundId]);

  const selectedRound = tournamentRounds.find((r) => r.id === selectedRoundId);

  const confirmedUserIds = useMemo(
    () =>
      quiniela?.participants
        .filter((p) => p.status === "confirmado")
        .map((p) => p.userId) ?? [],
    [quiniela],
  );

  const leaderboard = useMemo(() => {
    if (!quiniela) return [];
    return buildLeaderboard(users, predictions, quiniela.id, {
      userIds: confirmedUserIds,
    });
  }, [quiniela, users, predictions, confirmedUserIds]);

  const roundLeaderboards = useMemo(() => {
    if (!quiniela) return [];
    return roundsWithMatches.map(({ round, matches: roundMatches }) => {
      const finishedCount = roundMatches.filter((m) => m.status === "finished").length;
      return {
        round,
        finishedCount,
        entries: buildLeaderboard(users, predictions, quiniela.id, {
          matchIds: roundMatches.map((m) => m.id),
          userIds: confirmedUserIds,
        }),
      };
    });
  }, [quiniela, roundsWithMatches, users, predictions, confirmedUserIds]);

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

  const picksInRound = selectedRoundMatches.filter((m) =>
    predictions.some(
      (p) =>
        p.matchId === m.id &&
        p.quinielaId === quiniela.id &&
        p.userId === user?.id &&
        p.winner,
    ),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{quiniela.name}</h1>
          <p className="text-sm text-[var(--muted)]">{quiniela.tournamentName ?? "Liga"}</p>
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

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--elevated)] p-1">
        <TabButton active={tab === "pronosticos"} onClick={() => setTab("pronosticos")}>
          Pronósticos
        </TabButton>
        <TabButton active={tab === "ranking"} onClick={() => setTab("ranking")}>
          <Trophy size={15} />
          Ranking
        </TabButton>
      </div>

      {flash && (
        <p className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-2 text-sm text-[var(--success)]">
          {flash}
        </p>
      )}

      {tab === "pronosticos" && (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold">Elige la jornada</h2>
              <p className="text-sm text-[var(--muted)]">
                Selecciona una jornada y marca quién gana cada partido.
              </p>
            </div>
            {tournamentRounds.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Aún no hay jornadas en esta liga.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {roundsWithMatches.map(({ round, matches: roundMatches }) => (
                  <RoundChip
                    key={round.id}
                    round={round}
                    matchCount={roundMatches.length}
                    pickedCount={
                      roundMatches.filter((m) =>
                        predictions.some(
                          (p) =>
                            p.matchId === m.id &&
                            p.quinielaId === quiniela.id &&
                            p.userId === user?.id &&
                            p.winner,
                        ),
                      ).length
                    }
                    active={selectedRoundId === round.id}
                    onClick={() => setSelectedRoundId(round.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {selectedRound && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{selectedRound.name}</h2>
                <span className="text-sm text-[var(--muted)]">
                  {picksInRound}/{selectedRoundMatches.length} pronósticos
                </span>
              </div>
              {selectedRoundMatches.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No hay partidos en esta jornada.</p>
              ) : (
                <div className="space-y-4">
                  {selectedRoundMatches.map((match) => {
                    const home = teams.find((t) => t.id === match.homeTeamId);
                    const away = teams.find((t) => t.id === match.awayTeamId);
                    if (!home || !away) return null;
                    return (
                    <MatchCard
                      key={match.id}
                      match={match}
                      home={home}
                      away={away}
                      myPred={predictions.find(
                        (p) =>
                          p.matchId === match.id &&
                          p.quinielaId === quiniela.id &&
                          p.userId === user?.id,
                      )}
                      groupPreds={predictions.filter(
                        (p) => p.matchId === match.id && p.quinielaId === quiniela.id,
                      )}
                      members={members}
                      users={users}
                      now={now}
                      savingId={savingId}
                      showPoints={false}
                      onPick={pick}
                      pickLabel={pickLabel}
                    />
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {tab === "ranking" && (
        <>
          <LeaderboardSection
            title="Ranking general"
            subtitle="Suma de todas las jornadas con resultados capturados."
            entries={leaderboard}
            currentUserId={user?.id}
            emptyMessage="Aún no hay puntos. Juega tus pronósticos y espera los resultados."
            showWinner
          />

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">Ganadores por jornada</h2>
              <p className="text-sm text-[var(--muted)]">
                Ranking de cada jornada según los partidos ya finalizados.
              </p>
            </div>
            {roundLeaderboards.map(({ round, finishedCount, entries }) => {
              const hasPoints = entries.some((e) => e.totalPoints > 0);
              const winner = entries[0];
              return (
                <div key={round.id} className="card space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{round.name}</h3>
                    <span className="text-xs text-[var(--muted)]">
                      {finishedCount} {finishedCount === 1 ? "partido finalizado" : "partidos finalizados"}
                    </span>
                  </div>
                  {finishedCount === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      Esta jornada aún no tiene resultados. El ranking aparecerá cuando terminen los
                      partidos.
                    </p>
                  ) : !hasPoints ? (
                    <p className="text-sm text-[var(--muted)]">
                      Hay partidos finalizados pero aún no se han calculado los puntos.
                    </p>
                  ) : (
                    <>
                      {winner && winner.totalPoints > 0 && (
                        <div className="rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                            Líder de la jornada
                          </p>
                          <p className="mt-1 text-lg font-bold">
                            #{winner.rank} {winner.username}
                            {winner.userId === user?.id ? " (Tú)" : ""}
                            <span className="ml-2 text-[var(--primary)]">
                              {winner.totalPoints} pts · {winner.correctPredictions} aciertos
                            </span>
                          </p>
                        </div>
                      )}
                      <LeaderboardList entries={entries} currentUserId={user?.id} compact />
                    </>
                  )}
                </div>
              );
            })}
            {roundLeaderboards.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No hay jornadas en esta liga.</p>
            )}
          </section>
        </>
      )}

      <details className="card p-4">
        <summary className="cursor-pointer font-bold">Invitación y participantes</summary>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Copy size={16} className="text-[var(--primary)]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--muted)]">Link · Quiniela fácil (1 pt)</p>
              <p className="truncate font-semibold text-[var(--primary)]">{url}</p>
              <p className="text-xs text-[var(--muted)]">Código: {quiniela.code}</p>
            </div>
          </div>
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
              </span>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function LeaderboardSection({
  title,
  subtitle,
  entries,
  currentUserId,
  emptyMessage,
  showWinner = false,
}: {
  title: string;
  subtitle?: string;
  entries: LeaderboardEntry[];
  currentUserId?: string;
  emptyMessage: string;
  showWinner?: boolean;
}) {
  const hasPoints = entries.some((e) => e.totalPoints > 0);
  const winner = entries[0];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {!hasPoints ? (
        <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>
      ) : (
        <>
          {showWinner && winner && winner.totalPoints > 0 && (
            <div className="rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                Líder general
              </p>
              <p className="mt-1 text-lg font-bold">
                #{winner.rank} {winner.username}
                {winner.userId === currentUserId ? " (Tú)" : ""}
                <span className="ml-2 text-[var(--primary)]">
                  {winner.totalPoints} pts · {winner.correctPredictions} aciertos
                </span>
              </p>
            </div>
          )}
          <LeaderboardList entries={entries} currentUserId={currentUserId} />
        </>
      )}
    </section>
  );
}

function LeaderboardList({
  entries,
  currentUserId,
  compact = false,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={`flex items-center gap-3 rounded-xl border px-4 ${
            compact ? "py-2.5" : "py-3"
          } ${
            entry.userId === currentUserId
              ? "border-[var(--primary)]/50 bg-[var(--primary)]/10"
              : "border-[var(--border)] bg-[var(--elevated)]"
          } ${entry.rank === 1 && entry.totalPoints > 0 ? "border-[var(--primary)]/30" : ""}`}
        >
          <span
            className={`font-bold text-[var(--muted)] ${compact ? "w-7 text-sm" : "w-8"}`}
          >
            #{entry.rank}
          </span>
          <span className="flex-1 font-semibold">
            {entry.username}
            {entry.userId === currentUserId ? " (Tú)" : ""}
          </span>
          <span className={`text-[var(--muted)] ${compact ? "text-xs" : "text-sm"}`}>
            {entry.correctPredictions} aciertos
          </span>
          <span className={`font-bold text-[var(--primary)] ${compact ? "text-sm" : ""}`}>
            {entry.totalPoints} pts
          </span>
        </div>
      ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[var(--primary)]/20 text-[var(--primary)]"
          : "text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function RoundChip({
  round,
  matchCount,
  pickedCount,
  active,
  onClick,
}: {
  round: Round;
  matchCount: number;
  pickedCount: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
          : "border-[var(--border)] bg-[var(--elevated)] text-[var(--text)] hover:border-[var(--primary)]/40"
      }`}
    >
      <p className="font-semibold">{round.name}</p>
      <p className="mt-0.5 text-xs opacity-80">
        {matchCount} {matchCount === 1 ? "partido" : "partidos"}
        {matchCount > 0 ? ` · ${pickedCount}/${matchCount}` : ""}
      </p>
    </button>
  );
}

function MatchCard({
  match,
  home,
  away,
  myPred,
  groupPreds,
  members,
  users,
  now,
  savingId,
  showPoints,
  onPick,
  pickLabel,
}: {
  match: Match;
  home: Team;
  away: Team;
  myPred?: { winner?: WinnerPick; isCalculated?: boolean; pointsEarned?: number };
  groupPreds: Array<{ id: string; userId: string; winner?: WinnerPick }>;
  members: Array<{ userId: string }>;
  users: Array<{ id: string; username: string }>;
  now: Date;
  savingId: string | null;
  showPoints: boolean;
  onPick: (matchId: string, winner: WinnerPick) => void;
  pickLabel: (winner: WinnerPick | undefined, homeName: string, awayName: string) => string;
}) {
  const locked = isMatchLocked(match, now);
  const finished = match.status === "finished";
  const actual = matchActualWinner(match);
  const myOk = finished && actual && myPred?.winner ? myPred.winner === actual : undefined;

  const choices: { value: WinnerPick; label: string; color: string }[] = [
    { value: "home", label: `Gana ${home.shortName}`, color: home.primaryColor },
    { value: "draw", label: "Empate", color: "#FFB800" },
    { value: "away", label: `Gana ${away.shortName}`, color: away.primaryColor },
  ];

  return (
    <div className="card space-y-4 p-4">
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
            {myOk === true ? "¡Acertaste!" : myOk === false ? "No acertaste" : "Sin pronóstico"}
          </p>
          <p className="mt-1">
            Elegiste: <strong>{pickLabel(myPred?.winner, home.name, away.name)}</strong>
            {" · "}
            Resultado:{" "}
            <strong>{actual ? pickLabel(actual, home.name, away.name) : "—"}</strong>
          </p>
          {showPoints && myPred?.isCalculated && (
            <p className="mt-1 font-bold">+{myPred.pointsEarned ?? 0} pts</p>
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
              onClick={() => onPick(match.id, c.value)}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-semibold disabled:opacity-50"
              style={{ borderColor, background: bg, color: textColor }}
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
          . Ve al ranking cuando terminen los partidos.
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
            Se revelan cuando el partido termine.
          </p>
        ) : (
          <div className="space-y-1">
            {groupPreds.map((p) => {
              const name = users.find((u) => u.id === p.userId)?.username ?? "Participante";
              const label = pickLabel(p.winner, home.name, away.name);
              const ok = actual && p.winner === actual;
              return (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className={ok ? "font-semibold text-[var(--success)]" : "text-[var(--danger)]"}>
                    {label}
                    {ok ? " ✓" : " ✗"}
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
}
