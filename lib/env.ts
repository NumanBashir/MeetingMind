export type PublicEnvStatus = {
  isConfigured: boolean;
  missingKeys: string[];
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
};

const requiredPublicEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export function getPublicEnvStatus(): PublicEnvStatus {
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  const missingKeys = requiredPublicEnvKeys.filter((key) => !values[key]);

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
    supabaseUrl: values.NEXT_PUBLIC_SUPABASE_URL ?? null,
    supabasePublishableKey: values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null,
  };
}

export function requirePublicSupabaseEnv() {
  const status = getPublicEnvStatus();

  if (!status.isConfigured || !status.supabaseUrl || !status.supabasePublishableKey) {
    throw new Error(
      `Missing Supabase environment variables: ${status.missingKeys.join(", ")}`,
    );
  }

  return {
    supabaseUrl: status.supabaseUrl,
    supabasePublishableKey: status.supabasePublishableKey,
  };
}
