import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function getValidatedUser(supabase: SupabaseServerClient): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}
