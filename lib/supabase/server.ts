import { createClient } from "@supabase/supabase-js";
import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export function createServerSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = requirePublicSupabaseEnv();

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
