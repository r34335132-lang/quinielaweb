import type { Match } from "./types";

/** Minutos antes del inicio en que se cierran los pronósticos. */
export const LOCK_MINUTES_BEFORE = 60;

export function matchStart(match: Match): Date | null {
  if (!match.date || !match.time) return null;
  const time = match.time.length === 5 ? `${match.time}:00` : match.time;
  const start = new Date(`${match.date}T${time}`);
  return Number.isNaN(start.getTime()) ? null : start;
}

export function lockTime(match: Match): Date | null {
  const start = matchStart(match);
  if (!start) return null;
  return new Date(start.getTime() - LOCK_MINUTES_BEFORE * 60 * 1000);
}

/** Cerrado si ya inició/terminó, o si falta menos de 1 hora para el inicio. */
export function isMatchLocked(match: Match, now: Date = new Date()): boolean {
  if (["live", "finished", "cancelled"].includes(match.status)) return true;
  const lock = lockTime(match);
  if (!lock) return false;
  return now.getTime() >= lock.getTime();
}

export function formatLockLabel(match: Match, now: Date = new Date()): string {
  if (match.status === "finished") return "Finalizado";
  if (match.status === "live") return "En vivo · cerrado";
  if (match.status === "cancelled") return "Cancelado";
  const lock = lockTime(match);
  if (!lock) return "";
  if (now.getTime() >= lock.getTime()) return "Pronósticos cerrados (cierra 1 h antes)";
  const minutesLeft = Math.floor((lock.getTime() - now.getTime()) / 60000);
  if (minutesLeft < 60) return `Cierra en ${minutesLeft} min`;
  const hours = Math.floor(minutesLeft / 60);
  if (hours < 24) return `Cierra en ${hours} h`;
  return `Cierra ${lock.toLocaleDateString()} ${lock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
