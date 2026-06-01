import "server-only";

import { createClient } from "@supabase/supabase-js";

type Json = boolean | null | number | string | Json[] | { [key: string]: Json | undefined };

type DatabaseTable = {
  Insert: Record<string, Json | undefined>;
  Relationships: [];
  Row: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
};

type Database = {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: Record<string, DatabaseTable>;
    Views: Record<string, never>;
  };
};

let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Supabase.`);
  }

  return value;
}

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  supabaseAdmin = createClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}
