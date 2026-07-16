"use client";

import Link from "next/link";
import { Calendar, Edit3, Shield, Trophy } from "lucide-react";
import { useMemo } from "react";

import { TeamBadge } from "@/components/TeamBadge";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";

export default function AdminHomePage() {
  const { user } = useAuth();
  const { rounds, matches, teams } = useApp();

  const byRound = useMemo(
    () =>
      rounds.map((round) => ({
        round,
        matches: matches.filter((m) => m.roundId === round.id),
      })),
    [rounds, matches],
  );

  if (user?.role !== "administrador") {
    return (
      <div className="card p-8 text-center text-[var(--muted)]">
        Solo administradores pueden entrar aquí.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Panel de Administrador</h1>
        <p className="text-sm text-[var(--muted)]">
          Quiniela fácil: gana / empate / pierde · 1 punto por acierto. Al guardar el marcador se
          recalculan las sumas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminLink href="/admin/competitions" icon={Calendar} label="Ligas, jornadas y partidos" />
        <AdminLink href="/admin/teams" icon={Shield} label="Equipos y logos" tone="success" />
        <AdminLink href="/admin/quinielas" icon={Trophy} label="Gestionar quinielas" />
      </div>

      <section className="space-y-4">
        {byRound.map(({ round, matches: list }) => (
          <div key={round.id}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">{round.name}</h2>
              <span className="text-xs text-[var(--muted)]">
                {round.isClosed ? "Cerrada" : round.isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
            <div className="space-y-2">
              {list.map((match) => {
                const home = teams.find((t) => t.id === match.homeTeamId);
                const away = teams.find((t) => t.id === match.awayTeamId);
                if (!home || !away) return null;
                return (
                  <div key={match.id} className="card flex flex-wrap items-center gap-3 p-3">
                    <div className="flex min-w-[180px] flex-1 items-center justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <TeamBadge team={home} size={32} />
                        <span className="text-sm font-semibold">{home.shortName}</span>
                      </div>
                      <span className="font-bold text-[var(--muted)]">
                        {match.status === "finished"
                          ? `${match.homeScore} - ${match.awayScore}`
                          : "vs"}
                      </span>
                      <div className="flex items-center gap-2">
                        <TeamBadge team={away} size={32} />
                        <span className="text-sm font-semibold">{away.shortName}</span>
                      </div>
                    </div>
                    <span className="rounded-lg bg-[var(--elevated)] px-2 py-1 text-xs text-[var(--muted)]">
                      {match.status}
                    </span>
                    <Link href={`/admin/match/${match.id}`} className="btn btn-ghost py-2 text-sm">
                      <Edit3 size={14} /> Resultado
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function AdminLink({
  href,
  icon: Icon,
  label,
  tone = "primary",
}: {
  href: string;
  icon: typeof Calendar;
  label: string;
  tone?: "primary" | "success";
}) {
  const color = tone === "success" ? "var(--success)" : "var(--primary)";
  return (
    <Link
      href={href}
      className="card flex items-center gap-3 p-4 hover:border-[var(--primary)]/40"
      style={{ borderColor: `${color}44` }}
    >
      <span
        className="grid h-10 w-10 place-items-center rounded-xl"
        style={{ background: `${color}22`, color }}
      >
        <Icon size={18} />
      </span>
      <span className="font-semibold" style={{ color }}>
        {label}
      </span>
    </Link>
  );
}
