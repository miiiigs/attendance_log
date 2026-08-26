import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "../env";

export async function verifyPasswordForEmail(email: string, password: string) {
  const env = getPublicSupabaseEnv();
  const client = createClient(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (!error) {
    await client.auth.signOut({ scope: "local" });
  }

  return { error: error?.message ?? null };
}
