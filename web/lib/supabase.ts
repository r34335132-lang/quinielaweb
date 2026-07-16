import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function hasSupabaseConfig() {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes("placeholder.supabase.co") &&
      supabaseAnonKey !== "placeholder",
  );
}

/** Cliente único. Si faltan env vars, las llamadas fallan con mensaje claro. */
export const supabase: SupabaseClient = createClient(
  hasSupabaseConfig() ? supabaseUrl : "https://invalid.local",
  hasSupabaseConfig() ? supabaseAnonKey : "invalid",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const SUPABASE_CONFIG_ERROR =
  "Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel. Agrégalas en Settings → Environment Variables y vuelve a desplegar.";
