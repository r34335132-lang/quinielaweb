"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthProvider";
import {
  buildLeaderboard,
  mapMatch,
  mapPrediction,
  mapQuiniela,
  mapRound,
  mapTeam,
  mapTournament,
} from "@/lib/mappers";
import { isMatchLocked } from "@/lib/match";
import { pointsForPick, winnerFromScores } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type {
  LeaderboardEntry,
  Match,
  Prediction,
  Quiniela,
  QuinielaType,
  Round,
  Team,
  Tournament,
  WinnerPick,
} from "@/lib/types";

interface CreateQuinielaInput {
  name: string;
  organizerName: string;
  tournamentId: string;
  tournamentName: string;
  roundId: string;
  quinielaType: QuinielaType;
  rules?: string;
}

interface AppContextValue {
  teams: Team[];
  tournaments: Tournament[];
  rounds: Round[];
  matches: Match[];
  quinielas: Quiniela[];
  predictions: Prediction[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  getMyQuinielas: () => Quiniela[];
  getLeaderboard: (quinielaId: string) => LeaderboardEntry[];
  requestJoinQuiniela: (code: string) => Promise<Quiniela | null>;
  createQuiniela: (input: CreateQuinielaInput) => Promise<Quiniela>;
  savePrediction: (input: {
    matchId: string;
    quinielaId: string;
    winner: WinnerPick;
  }) => Promise<void>;
  updateMatchResult: (
    matchId: string,
    updates: { status: Match["status"]; homeScore: number; awayScore: number },
  ) => Promise<void>;
  recalculatePoints: (matchId: string) => Promise<void>;
  validateQuiniela: (id: string) => Promise<void>;
  activateQuiniela: (id: string) => Promise<void>;
  rejectQuiniela: (id: string) => Promise<void>;
  deactivateQuiniela: (id: string) => Promise<void>;
  confirmParticipant: (qid: string, uid: string) => Promise<void>;
  rejectParticipant: (qid: string, uid: string) => Promise<void>;
  saveTeam: (input: {
    id?: string;
    name: string;
    shortName: string;
    city: string;
    primaryColor: string;
    secondaryColor: string;
    logoFile?: File | null;
  }) => Promise<void>;
  createTournament: (name: string, season: string) => Promise<void>;
  createRound: (input: {
    tournamentId: string;
    number: number;
    name: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  createMatch: (input: {
    tournamentId: string;
    roundId: string;
    homeTeamId: string;
    awayTeamId: string;
    date: string;
    time: string;
    venue?: string;
  }) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, users, refreshUsers } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [quinielas, setQuinielas] = useState<Quiniela[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [teamR, tournamentR, roundR, matchR, quinielaR, predictionR] =
      await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
        supabase.from("rounds").select("*").order("number"),
        supabase.from("matches").select("*").order("match_date"),
        supabase
          .from("quinielas")
          .select("*, quiniela_participants(*)")
          .order("created_at", { ascending: false }),
        supabase.from("predictions").select("*"),
      ]);
    const critical = [teamR, tournamentR, matchR, quinielaR, predictionR].find(
      (r) => r.error,
    );
    if (critical?.error) throw critical.error;
    setTeams((teamR.data ?? []).map(mapTeam));
    setTournaments((tournamentR.data ?? []).map(mapTournament));
    setRounds((roundR.data ?? []).map(mapRound));
    setMatches((matchR.data ?? []).map(mapMatch));
    setQuinielas((quinielaR.data ?? []).map(mapQuiniela));
    setPredictions((predictionR.data ?? []).map(mapPrediction));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => setIsLoading(false));
  }, [refresh]);

  const getMyQuinielas = useCallback(
    () =>
      quinielas.filter(
        (q) =>
          q.creatorId === user?.id ||
          q.participants.some((p) => p.userId === user?.id && p.status !== "eliminado"),
      ),
    [quinielas, user],
  );

  const leaderboardFor = useCallback(
    (quinielaId: string) => buildLeaderboard(users, predictions, quinielaId),
    [users, predictions],
  );

  const requestJoinQuiniela = useCallback(
    async (code: string) => {
      if (!user) return null;
      const found = quinielas.find(
        (q) =>
          q.code.toUpperCase() === code.trim().toUpperCase() && q.status === "activa",
      );
      if (!found) return null;
      const existing = found.participants.find((p) => p.userId === user.id);
      if (existing?.status === "confirmado") return found;
      const { error } = await supabase.from("quiniela_participants").upsert(
        {
          quiniela_id: found.id,
          user_id: user.id,
          status: "confirmado",
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "quiniela_id,user_id" },
      );
      if (error) throw error;
      await refresh();
      return found;
    },
    [quinielas, user, refresh],
  );

  const createQuiniela = useCallback(
    async (input: CreateQuinielaInput) => {
      if (!user) throw new Error("Sesión requerida");
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from("quinielas")
        .insert({
          name: input.name,
          code,
          organizer_id: user.id,
          organizer_name: input.organizerName,
          tournament_id: input.tournamentId,
          selected_round_id: input.roundId,
          tournament_name: input.tournamentName,
          quiniela_type: input.quinielaType,
          prediction_mode: "simple",
          group_rules: input.rules || null,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("quiniela_participants").insert({
        quiniela_id: data.id,
        user_id: user.id,
        status: "confirmado",
        confirmed_at: new Date().toISOString(),
      });
      await refresh();
      return mapQuiniela({ ...data, quiniela_participants: [] });
    },
    [user, refresh],
  );

  const savePrediction = useCallback(
    async (input: { matchId: string; quinielaId: string; winner: WinnerPick }) => {
      if (!user) return;
      const match = matches.find((m) => m.id === input.matchId);
      if (match && isMatchLocked(match)) {
        throw new Error("Los pronósticos cierran 1 hora antes del partido");
      }
      const homeScore = input.winner === "home" ? 1 : 0;
      const awayScore = input.winner === "away" ? 1 : 0;
      const { error } = await supabase.from("predictions").upsert(
        {
          user_id: user.id,
          match_id: input.matchId,
          quiniela_id: input.quinielaId,
          winner: input.winner,
          home_score: homeScore,
          away_score: awayScore,
          is_partido_doble: false,
        },
        { onConflict: "user_id,match_id,quiniela_id" },
      );
      if (error) throw error;
      await refresh();
    },
    [user, matches, refresh],
  );

  const updateMatchResult = useCallback(
    async (
      matchId: string,
      updates: { status: Match["status"]; homeScore: number; awayScore: number },
    ) => {
      const { error } = await supabase
        .from("matches")
        .update({
          status: updates.status,
          home_score: updates.homeScore,
          away_score: updates.awayScore,
        })
        .eq("id", matchId);
      if (error) throw error;

      // Si el partido deja de estar finalizado, limpia puntos de ese partido.
      if (updates.status !== "finished") {
        await supabase
          .from("predictions")
          .update({
            points_earned: null,
            is_result_correct: null,
            is_calculated: false,
          })
          .eq("match_id", matchId);
      }

      await refresh();
    },
    [refresh],
  );

  /** Calcula 1 pt por acierto 1X2 en el cliente (fallback si no hay RPC). */
  const recalculatePointsLocally = useCallback(async (matchId: string) => {
    const { data: matchRow, error: matchErr } = await supabase
      .from("matches")
      .select("id, status, home_score, away_score")
      .eq("id", matchId)
      .single();
    if (matchErr) throw matchErr;
    if (matchRow.status !== "finished") {
      throw new Error("El partido debe estar finalizado para sumar puntos.");
    }
    const homeScore = Number(matchRow.home_score ?? 0);
    const awayScore = Number(matchRow.away_score ?? 0);
    const actual = winnerFromScores(homeScore, awayScore);

    const { data: preds, error: predErr } = await supabase
      .from("predictions")
      .select("id, winner, user_id")
      .eq("match_id", matchId);
    if (predErr) throw predErr;

    for (const pred of preds ?? []) {
      const { correct, points } = pointsForPick(
        (pred.winner as WinnerPick | null) ?? undefined,
        actual,
      );
      const { error } = await supabase
        .from("predictions")
        .update({
          points_earned: points,
          is_result_correct: correct,
          is_calculated: true,
        })
        .eq("id", pred.id);
      if (error) throw error;
    }
  }, []);

  const recalculatePoints = useCallback(
    async (matchId: string) => {
      const { error } = await supabase.rpc("recalculate_match_points", {
        target_match_id: matchId,
      });
      if (error) {
        // Si la función no existe o falla, suma puntos en el cliente.
        await recalculatePointsLocally(matchId);
      }
      await Promise.all([refresh(), refreshUsers()]);
    },
    [refresh, refreshUsers, recalculatePointsLocally],
  );

  const updateQ = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      const { error } = await supabase.from("quinielas").update(values).eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const participantStatus = useCallback(
    async (qid: string, uid: string, status: string) => {
      const { error } = await supabase
        .from("quiniela_participants")
        .update({
          status,
          confirmed_at: status === "confirmado" ? new Date().toISOString() : null,
          confirmed_by: user?.id,
        })
        .eq("quiniela_id", qid)
        .eq("user_id", uid);
      if (error) throw error;
      await refresh();
    },
    [user, refresh],
  );

  const saveTeam = useCallback(
    async (input: {
      id?: string;
      name: string;
      shortName: string;
      city: string;
      primaryColor: string;
      secondaryColor: string;
      logoFile?: File | null;
    }) => {
      const values = {
        name: input.name.trim(),
        short_name: input.shortName.trim().toUpperCase(),
        city: input.city.trim() || null,
        primary_color: input.primaryColor,
        secondary_color: input.secondaryColor,
      };
      const query = input.id
        ? supabase.from("teams").update(values).eq("id", input.id)
        : supabase.from("teams").insert(values);
      const { data, error } = await query.select().single();
      if (error) throw error;
      if (input.logoFile) {
        const mime = input.logoFile.type || "image/jpeg";
        const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        const path = `${data.id}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("team-logos")
          .upload(path, input.logoFile, { contentType: mime, upsert: true });
        if (upErr) throw upErr;
        const logoUrl = supabase.storage.from("team-logos").getPublicUrl(path).data
          .publicUrl;
        const { error: logoErr } = await supabase
          .from("teams")
          .update({ logo_url: logoUrl })
          .eq("id", data.id);
        if (logoErr) throw logoErr;
      }
      await refresh();
    },
    [refresh],
  );

  const createTournament = useCallback(
    async (name: string, season: string) => {
      const { error } = await supabase.from("tournaments").insert({
        name: name.trim(),
        season: season.trim(),
        phase: "temporada",
        is_active: true,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const createRound = useCallback(
    async (input: {
      tournamentId: string;
      number: number;
      name: string;
      startDate: string;
      endDate: string;
    }) => {
      const { error } = await supabase.from("rounds").insert({
        tournament_id: input.tournamentId,
        number: input.number,
        name: input.name.trim(),
        start_date: input.startDate,
        end_date: input.endDate,
        is_active: true,
        is_closed: false,
      });
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const createMatch = useCallback(
    async (input: {
      tournamentId: string;
      roundId: string;
      homeTeamId: string;
      awayTeamId: string;
      date: string;
      time: string;
      venue?: string;
    }) => {
      const { error } = await supabase.from("matches").insert({
        tournament_id: input.tournamentId,
        round_id: input.roundId,
        home_team_id: input.homeTeamId,
        away_team_id: input.awayTeamId,
        match_date: input.date,
        match_time: input.time,
        venue: input.venue?.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      teams,
      tournaments,
      rounds,
      matches,
      quinielas,
      predictions,
      isLoading,
      refresh,
      getMyQuinielas,
      getLeaderboard: leaderboardFor,
      requestJoinQuiniela,
      createQuiniela,
      savePrediction,
      updateMatchResult,
      recalculatePoints,
      validateQuiniela: (id) => updateQ(id, { is_validated: true, status: "validada" }),
      activateQuiniela: (id) => updateQ(id, { status: "activa" }),
      rejectQuiniela: (id) => updateQ(id, { status: "rechazada" }),
      deactivateQuiniela: (id) => updateQ(id, { status: "cancelada" }),
      confirmParticipant: (q, u) => participantStatus(q, u, "confirmado"),
      rejectParticipant: (q, u) => participantStatus(q, u, "rechazado"),
      saveTeam,
      createTournament,
      createRound,
      createMatch,
    }),
    [
      teams,
      tournaments,
      rounds,
      matches,
      quinielas,
      predictions,
      isLoading,
      refresh,
      getMyQuinielas,
      leaderboardFor,
      requestJoinQuiniela,
      createQuiniela,
      savePrediction,
      updateMatchResult,
      recalculatePoints,
      updateQ,
      participantStatus,
      saveTeam,
      createTournament,
      createRound,
      createMatch,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
