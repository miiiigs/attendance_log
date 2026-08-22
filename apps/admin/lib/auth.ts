import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

type AdminProfile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
  status: string;
  platform_role?: string | null;
};

async function getProfile(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const withPlatformRole = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, status, platform_role")
    .eq("id", userId)
    .maybeSingle<AdminProfile>();

  if (!withPlatformRole.error) {
    return withPlatformRole.data ?? null;
  }

  if (!withPlatformRole.error.message.toLowerCase().includes("platform_role")) {
    return null;
  }

  const fallback = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, status")
    .eq("id", userId)
    .maybeSingle<Omit<AdminProfile, "platform_role">>();

  if (fallback.error || !fallback.data) {
    return null;
  }

  return {
    ...fallback.data,
    platform_role: "user",
  } satisfies AdminProfile;
}

function isActiveAdmin(profile: AdminProfile | null) {
  if (!profile || profile.status !== "active") {
    return false;
  }

  return profile.role === "admin" || profile.platform_role === "platform_admin";
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, session.user.id);

  if (!isActiveAdmin(profile)) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { supabase, session, profile: profile! };
}

/**
 * Allows platform admins and any active organization admin. Used by the
 * legacy `(protected)` area whose dashboard now redirects org admins to
 * their organization console.
 */
export async function requireAdminOrOrgAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, session.user.id);

  if (!isActiveAdmin(profile)) {
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("role", "organization_admin")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!membership) {
      await supabase.auth.signOut();
      redirect("/login");
    }
  }

  return { supabase, session, profile: profile! };
}

export async function resolveDefaultOrgSlug(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: organizationId } = await supabase.rpc("get_default_organization_id");

  if (typeof organizationId !== "string") {
    return null;
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", organizationId)
    .maybeSingle();

  return organization?.slug ?? null;
}

export async function requireAdminApiContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const profile = await getProfile(supabase, session.user.id);

  if (!isActiveAdmin(profile)) {
    return null;
  }

  return { session, profile: profile! };
}

export async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, session.user.id);

  if (!profile || profile.status !== "active" || profile.platform_role !== "platform_admin") {
    redirect("/");
  }

  return { supabase, session, profile: profile! };
}

export async function requirePlatformAdminApiContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const profile = await getProfile(supabase, session.user.id);

  if (!profile || profile.status !== "active" || profile.platform_role !== "platform_admin") {
    return null;
  }

  return { session, profile: profile! };
}
