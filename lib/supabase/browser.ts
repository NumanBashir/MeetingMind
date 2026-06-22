import { createClient } from "@supabase/supabase-js";
import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = requirePublicSupabaseEnv();

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
