import type {
  LeaderboardEntry,
  Match,
  Prediction,
  Quiniela,
  Round,
  Team,
  Tournament,
  User,
  WinnerPick,
} from "./types";

type Row = Record<string, unknown>;

export const mapTeam = (r: Row): Team => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  shortName: String(r.short_name ?? ""),
  primaryColor: String(r.primary_color ?? "#00C4FF"),
  secondaryColor: String(r.secondary_color ?? "#FFFFFF"),
  city: String(r.city ?? ""),
  logoUrl: r.logo_url ? String(r.logo_url) : undefined,
});

export const mapTournament = (r: Row): Tournament => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  season: String(r.season ?? ""),
  isActive: Boolean(r.is_active),
});

export const mapRound = (r: Row): Round => ({
  id: String(r.id),
  tournamentId: String(r.tournament_id ?? ""),
  number: Number(r.number ?? 0),
  name: String(r.name ?? ""),
  startDate: String(r.start_date ?? ""),
  endDate: String(r.end_date ?? ""),
  isActive: Boolean(r.is_active),
  isClosed: Boolean(r.is_closed),
});

export const mapMatch = (r: Row): Match => ({
  id: String(r.id),
  roundId: String(r.round_id ?? ""),
  tournamentId: String(r.tournament_id ?? ""),
  homeTeamId: String(r.home_team_id ?? ""),
  awayTeamId: String(r.away_team_id ?? ""),
  date: String(r.match_date ?? ""),
  time: String(r.match_time ?? ""),
  venue: r.venue ? String(r.venue) : undefined,
  status: r.status as Match["status"],
  homeScore: r.home_score === null || r.home_score === undefined ? undefined : Number(r.home_score),
  awayScore: r.away_score === null || r.away_score === undefined ? undefined : Number(r.away_score),
});

export const mapPrediction = (r: Row): Prediction => ({
  id: String(r.id),
  userId: String(r.user_id ?? ""),
  matchId: String(r.match_id ?? ""),
  quinielaId: String(r.quiniela_id ?? ""),
  winner: (r.winner as WinnerPick | null) ?? undefined,
  homeScore: r.home_score === null || r.home_score === undefined ? undefined : Number(r.home_score),
  awayScore: r.away_score === null || r.away_score === undefined ? undefined : Number(r.away_score),
  pointsEarned:
    r.points_earned === null || r.points_earned === undefined
      ? undefined
      : Number(r.points_earned),
  isResultCorrect:
    r.is_result_correct === null || r.is_result_correct === undefined
      ? undefined
      : Boolean(r.is_result_correct),
  isCalculated:
    r.is_calculated === null || r.is_calculated === undefined
      ? undefined
      : Boolean(r.is_calculated),
  createdAt: String(r.created_at ?? ""),
  updatedAt: String(r.updated_at ?? ""),
});

export const mapQuiniela = (r: Row): Quiniela => {
  const participants = Array.isArray(r.quiniela_participants)
    ? (r.quiniela_participants as Row[])
    : [];
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    code: String(r.code ?? ""),
    creatorId: String(r.organizer_id ?? ""),
    organizerName: String(r.organizer_name ?? ""),
    tournamentId: String(r.tournament_id ?? ""),
    tournamentName: r.tournament_name ? String(r.tournament_name) : undefined,
    roundId: String(r.selected_round_id ?? ""),
    quinielaType: r.quiniela_type as Quiniela["quinielaType"],
    status: r.status as Quiniela["status"],
    predictionMode: "simple",
    rules: r.group_rules ? String(r.group_rules) : undefined,
    isValidated: Boolean(r.is_validated),
    participants: participants.map((p) => ({
      userId: String(p.user_id ?? ""),
      status: p.status as Quiniela["participants"][number]["status"],
      confirmedAt: p.confirmed_at ? String(p.confirmed_at) : undefined,
      joinedAt: String(p.joined_at ?? p.created_at ?? ""),
    })),
    createdAt: String(r.created_at ?? ""),
  };
};

export const mapUser = (r: Row): User => ({
  id: String(r.id),
  username: String(r.username ?? ""),
  email: String(r.email ?? ""),
  role: (r.role as User["role"]) ?? "usuario",
  totalPoints: Number(r.total_points ?? 0),
  totalPredictions: Number(r.total_predictions ?? 0),
  correctPredictions: Number(r.correct_predictions ?? 0),
  createdAt: String(r.created_at ?? ""),
});

export function buildLeaderboard(
  users: User[],
  predictions: Prediction[],
  quinielaId: string,
): LeaderboardEntry[] {
  const filtered = predictions.filter((p) => p.quinielaId === quinielaId);
  const stats = new Map<
    string,
    { totalPoints: number; totalPredictions: number; correctPredictions: number }
  >();

  for (const pred of filtered) {
    // Solo cuentan puntos de partidos ya finalizados y calculados.
    if (!pred.isCalculated) continue;
    const current = stats.get(pred.userId) ?? {
      totalPoints: 0,
      totalPredictions: 0,
      correctPredictions: 0,
    };
    current.totalPoints += pred.pointsEarned ?? 0;
    current.totalPredictions += 1;
    if (pred.isResultCorrect) current.correctPredictions += 1;
    stats.set(pred.userId, current);
  }

  return users
    .filter((u) => stats.has(u.id))
    .map((u) => {
      const s = stats.get(u.id)!;
      return {
        userId: u.id,
        username: u.username,
        totalPoints: s.totalPoints,
        totalPredictions: s.totalPredictions,
        correctPredictions: s.correctPredictions,
        rank: 0,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function inviteUrl(code: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/join/${code.trim().toUpperCase()}`;
  }
  return `/join/${code.trim().toUpperCase()}`;
}
