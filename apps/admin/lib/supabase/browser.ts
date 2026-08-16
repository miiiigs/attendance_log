import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "../env";

export function createSupabaseBrowserClient() {
  const env = getPublicSupabaseEnv();
  return createBrowserClient(env.url, env.anonKey);
}
