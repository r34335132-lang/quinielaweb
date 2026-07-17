import type { Match, WinnerPick } from "@/lib/types";

/** Resultado 1X2 a partir del marcador. */
export function winnerFromScores(
  homeScore: number,
  awayScore: number,
): WinnerPick {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

export function matchActualWinner(match: Match): WinnerPick | undefined {
  if (
    match.status !== "finished" ||
    match.homeScore === undefined ||
    match.awayScore === undefined
  ) {
    return undefined;
  }
  return winnerFromScores(match.homeScore, match.awayScore);
}

export function pointsForPick(
  pick: WinnerPick | undefined,
  actual: WinnerPick,
): { correct: boolean; points: number } {
  const correct = pick === actual;
  return { correct, points: correct ? 1 : 0 };
}
