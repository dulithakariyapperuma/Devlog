import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.
 * When false the app runs entirely on local mock data.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
    console.warn(
        "[DevLog] Supabase is not configured — running with mock data.\n" +
        "Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable the backend.\n" +
        "See .env.example for the template."
    );
}

// Safe to call createClient with placeholder values when not configured —
// the client is never actually used when isSupabaseConfigured is false.
export const supabase = createClient<Database>(
    supabaseUrl ?? "https://placeholder.supabase.co",
    supabaseAnonKey ?? "placeholder-anon-key"
);
