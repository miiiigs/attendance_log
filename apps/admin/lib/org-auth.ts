import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { getValidatedUser } from "./validated-user";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface OrgConsoleContext {
  organization: {
    id: string;
    name: string;
    code: string;
    slug: string;
    timezone: string;
    status: string;
  };
  membership: {
    id: string;
    user_id: string;
    username: string;
    role: string;
    status: string;
  } | null;
}

async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, status, platform_role")
    .eq("id", userId)
    .maybeSingle();

  return data ?? null;
}

async function resolveOrgContext(supabase: SupabaseClient, slug: string, userId: string): Promise<OrgConsoleContext | null> {
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, code, slug, timezone, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!organization || organization.status !== "active") {
    return null;
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, user_id, username, role, status")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .eq("role", "organization_admin")
    .eq("status", "active")
    .maybeSingle();

  return { organization, membership };
}

function isAuthorized(profile: { status: string; platform_role: string | null } | null, membership: OrgConsoleContext["membership"]) {
  if (!profile || profile.status !== "active") {
    return false;
  }

  if (profile.platform_role === "platform_admin") {
    return true;
  }

  return membership?.role === "organization_admin" && membership.status === "active";
}

/**
 * Page/layout guard for `/org/[slug]/*`. Redirects to /login or / when the
 * session, organization, or membership is not authorized.
 */
export async function requireOrgAdmin(slug: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getValidatedUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  const context = await resolveOrgContext(supabase, slug, user.id);

  if (!context || !isAuthorized(profile, context.membership)) {
    await supabase.auth.signOut();
    redirect("/");
  }

  return { supabase, user, profile: profile!, ...context };
}

/**
 * API-route guard for `/api/org/[slug]/*`. Returns null when unauthorized.
 */
export async function requireOrgAdminApiContext(slug: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getValidatedUser(supabase);

  if (!user) {
    return null;
  }

  const profile = await getProfile(supabase, user.id);
  const context = await resolveOrgContext(supabase, slug, user.id);

  if (!context || !isAuthorized(profile, context.membership)) {
    return null;
  }

  return { supabase, user, profile: profile!, ...context };
}
