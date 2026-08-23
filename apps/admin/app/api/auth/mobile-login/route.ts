import { organizationLoginSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "../../../../lib/env";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

const GENERIC_CREDENTIALS_ERROR = "Invalid organization code, username, or password.";

export async function POST(request: Request) {
  const parsed = organizationLoginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_CREDENTIALS_ERROR }, { status: 400 });
  }

  const { organizationCode, username, password } = parsed.data;
  const supabase = createSupabaseServiceClient();

  // Resolve the organization by its normalized code. Unknown codes fail
  // generically so the endpoint never reveals whether an organization exists.
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, code, slug, timezone, status")
    .eq("code", organizationCode)
    .maybeSingle();

  if (organizationError || !organization) {
    return NextResponse.json({ error: GENERIC_CREDENTIALS_ERROR }, { status: 401 });
  }

  if (organization.status !== "active") {
    return NextResponse.json({ error: "This organization is currently unavailable." }, { status: 403 });
  }

  // Resolve the membership inside that organization. Username is the
  // organization-scoped identity (not the global profile username).
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("id, user_id, username, role, status")
    .eq("organization_id", organization.id)
    .ilike("username", username.trim())
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: GENERIC_CREDENTIALS_ERROR }, { status: 401 });
  }

  if (membership.status !== "active") {
    return NextResponse.json({ error: "This account is currently inactive." }, { status: 403 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .eq("id", membership.user_id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: GENERIC_CREDENTIALS_ERROR }, { status: 401 });
  }

  if (profile.status !== "active") {
    return NextResponse.json({ error: "This account is currently inactive." }, { status: 403 });
  }

  // Resolve the actual Supabase Auth identity for this global user id. The
  // auth email strategy (real email vs {username}@attendance.local) can vary
  // across environments, so we never guess it from the organization username.
  const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(membership.user_id);

  if (authUserError || !authUser.user?.email) {
    return NextResponse.json({ error: GENERIC_CREDENTIALS_ERROR }, { status: 401 });
  }

  const env = getPublicSupabaseEnv();
  const authResponse = await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: authUser.user.email,
      password,
    }),
  });

  const authResult = (await authResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: number;
    token_type?: string;
    user?: unknown;
    error?: string;
  };

  if (!authResponse.ok || !authResult.access_token || !authResult.refresh_token || !authResult.user) {
    return NextResponse.json({ error: GENERIC_CREDENTIALS_ERROR }, { status: 401 });
  }

  return NextResponse.json({
    access_token: authResult.access_token,
    refresh_token: authResult.refresh_token,
    expires_in: authResult.expires_in,
    expires_at: authResult.expires_at,
    token_type: authResult.token_type,
    user: authResult.user,
    organization: {
      id: organization.id,
      code: organization.code,
      slug: organization.slug,
      name: organization.name,
      timezone: organization.timezone,
    },
    membership: {
      id: membership.id,
      userId: membership.user_id,
      username: membership.username,
      role: membership.role,
      status: membership.status,
    },
    profile: {
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
    },
  });
}
