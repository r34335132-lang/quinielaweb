export type UserRole = "usuario" | "organizador" | "administrador";
export type QuinielaStatus =
  | "pendiente"
  | "en_revision"
  | "validada"
  | "activa"
  | "finalizada"
  | "rechazada"
  | "cancelada";
export type QuinielaType = "general" | "privada" | "corporativa" | "amigos";
export type ParticipantStatus = "pendiente" | "confirmado" | "rechazado" | "eliminado";
export type MatchStatus = "pending" | "live" | "finished" | "cancelled";
export type WinnerPick = "home" | "away" | "draw";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  city: string;
  logoUrl?: string;
}

export interface Tournament {
  id: string;
  name: string;
  season: string;
  isActive: boolean;
}

export interface Round {
  id: string;
  tournamentId: string;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
}

export interface Match {
  id: string;
  roundId: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  venue?: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
}

export interface QuinielaParticipant {
  userId: string;
  status: ParticipantStatus;
  confirmedAt?: string;
  joinedAt: string;
}

export interface Quiniela {
  id: string;
  name: string;
  code: string;
  creatorId: string;
  organizerName: string;
  tournamentId: string;
  tournamentName?: string;
  roundId: string;
  quinielaType: QuinielaType;
  status: QuinielaStatus;
  predictionMode: "simple";
  rules?: string;
  isValidated: boolean;
  participants: QuinielaParticipant[];
  createdAt: string;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  quinielaId: string;
  winner?: WinnerPick;
  homeScore?: number;
  awayScore?: number;
  pointsEarned?: number;
  isResultCorrect?: boolean;
  isCalculated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  rank: number;
}
