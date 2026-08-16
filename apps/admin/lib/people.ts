import { createSupabaseServiceClient } from "./supabase/service";

export async function getOrganizationName() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("organization_name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.organization_name ?? "Attendance";
}

export async function getPersonByIdForCredentials(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, email, role, status")
    .eq("id", id)
    .eq("role", "person")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
