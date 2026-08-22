import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export type LegacyOrgResolution =
  | { kind: "single"; slug: string }
  | { kind: "platform" }
  | { kind: "ambiguous" }
  | { kind: "none" };

/**
 * Resolves the organization(s) an authenticated admin may operate for the
 * purpose of redirecting legacy organization-admin routes.
 *
 * Deliberately never auto-selects the first organization when a user holds
 * multiple eligible organization-admin memberships. Only a single eligible
 * membership produces a deterministic redirect; ambiguous cases route to a
 * neutral selection page.
 */
export async function resolveLegacyOrg(): Promise<LegacyOrgResolution> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profile?.platform_role === "platform_admin") {
    return { kind: "platform" };
  }

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("organization_id, organizations!organization_memberships_organization_id_fkey(slug)")
    .eq("user_id", session.user.id)
    .eq("role", "organization_admin")
    .eq("status", "active");

  const slugs = (memberships ?? [])
    .map((membership) => {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;
      return organization?.slug ?? null;
    })
    .filter((slug): slug is string => Boolean(slug));

  if (slugs.length === 1) {
    return { kind: "single", slug: slugs[0]! };
  }

  if (slugs.length > 1) {
    return { kind: "ambiguous" };
  }

  return { kind: "none" };
}
