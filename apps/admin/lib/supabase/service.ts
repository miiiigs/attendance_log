import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServiceRoleKey } from "../env";

export function createSupabaseServiceClient() {
  const env = getPublicSupabaseEnv();
  const serviceRoleKey = getServiceRoleKey();

  return createClient(env.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
