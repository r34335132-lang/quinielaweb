"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { TeamBadge } from "@/components/TeamBadge";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";

export default function AdminCompetitionsPage() {
  const { user } = useAuth();
  const {
    tournaments,
    rounds,
    teams,
    matches,
    createTournament,
    createRound,
    createMatch,
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [league, setLeague] = useState({ name: "", season: String(new Date().getFullYear()) });
  const [round, setRound] = useState({
    tournamentId: "",
    number: "1",
    name: "Jornada 1",
    startDate: "",
    endDate: "",
  });
  const [match, setMatch] = useState({
    tournamentId: "",
    roundId: "",
    homeTeamId: "",
    awayTeamId: "",
    date: "",
    time: "19:00",
    venue: "",
  });

  const filteredRounds = useMemo(
    () => rounds.filter((r) => r.tournamentId === match.tournamentId && !r.isClosed),
    [rounds, match.tournamentId],
  );

  if (user?.role !== "administrador") {
    return <p className="text-[var(--muted)]">Acceso solo admin.</p>;
  }

  const run = async (action: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg("");
    try {
      await action();
      setMsg(ok);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <ArrowLeft size={16} /> Admin
      </Link>
      <h1 className="text-2xl font-bold">Ligas, jornadas y partidos</h1>
      {msg && <p className="text-sm text-[var(--primary)]">{msg}</p>}

      <Section title="1. Crear liga">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void run(
              () => createTournament(league.name, league.season),
              "Liga creada.",
            );
          }}
        >
          <input
            className="input"
            placeholder="Nombre de liga"
            value={league.name}
            onChange={(e) => setLeague({ ...league, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Temporada"
            value={league.season}
            onChange={(e) => setLeague({ ...league, season: e.target.value })}
            required
          />
          <button className="btn btn-primary" disabled={busy} type="submit">
            Crear liga
          </button>
        </form>
      </Section>

      <Section title="2. Crear jornada">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void run(
              () =>
                createRound({
                  tournamentId: round.tournamentId,
                  number: Number(round.number),
                  name: round.name,
                  startDate: round.startDate,
                  endDate: round.endDate,
                }),
              "Jornada creada.",
            );
          }}
        >
          <select
            className="input"
            value={round.tournamentId}
            onChange={(e) => setRound({ ...round, tournamentId: e.target.value })}
            required
          >
            <option value="">Liga…</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.season}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={round.number}
            onChange={(e) =>
              setRound({ ...round, number: e.target.value, name: `Jornada ${e.target.value}` })
            }
          />
          <input
            className="input"
            value={round.name}
            onChange={(e) => setRound({ ...round, name: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={round.startDate}
            onChange={(e) => setRound({ ...round, startDate: e.target.value })}
            required
          />
          <input
            className="input"
            type="date"
            value={round.endDate}
            onChange={(e) => setRound({ ...round, endDate: e.target.value })}
            required
          />
          <button className="btn btn-primary" disabled={busy} type="submit">
            Crear jornada
          </button>
        </form>
      </Section>

      <Section title="3. Cargar partido">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void run(() => createMatch(match), "Partido publicado.");
          }}
        >
          <select
            className="input"
            value={match.tournamentId}
            onChange={(e) =>
              setMatch({ ...match, tournamentId: e.target.value, roundId: "" })
            }
            required
          >
            <option value="">Liga…</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={match.roundId}
            onChange={(e) => setMatch({ ...match, roundId: e.target.value })}
            required
          >
            <option value="">Jornada…</option>
            {filteredRounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setMatch({ ...match, homeTeamId: team.id })}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${
                  match.homeTeamId === team.id
                    ? "border-[var(--primary)] bg-[var(--primary)]/15"
                    : "border-[var(--border)]"
                }`}
              >
                <TeamBadge team={team} size={24} />
                <span className="text-xs">{team.shortName}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">Local ↑ · Visitante ↓</p>
          <div className="flex flex-wrap gap-2">
            {teams
              .filter((t) => t.id !== match.homeTeamId)
              .map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setMatch({ ...match, awayTeamId: team.id })}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${
                    match.awayTeamId === team.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/15"
                      : "border-[var(--border)]"
                  }`}
                >
                  <TeamBadge team={team} size={24} />
                  <span className="text-xs">{team.shortName}</span>
                </button>
              ))}
          </div>
          <input
            className="input"
            type="date"
            value={match.date}
            onChange={(e) => setMatch({ ...match, date: e.target.value })}
            required
          />
          <input
            className="input"
            type="time"
            value={match.time}
            onChange={(e) => setMatch({ ...match, time: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Sede (opcional)"
            value={match.venue}
            onChange={(e) => setMatch({ ...match, venue: e.target.value })}
          />
          <button className="btn btn-primary" disabled={busy} type="submit">
            Publicar partido
          </button>
        </form>
      </Section>

      <p className="text-sm text-[var(--muted)]">
        {tournaments.length} ligas · {rounds.length} jornadas · {matches.length} partidos
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}
