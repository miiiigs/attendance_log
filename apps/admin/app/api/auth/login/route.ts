import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

const GENERIC_ERROR = "Invalid username/email or password.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeLikePattern(value: string) {
  return value.replace(/([\\%_])/g, "\\$1");
}

type MembershipMatch = {
  user_id: string;
  status: string;
  organizations: { status: string } | Array<{ status: string }> | null;
  profiles: { status: string } | Array<{ status: string }> | null;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { identifier?: unknown; password?: unknown } | null;

  const identifier = typeof payload?.identifier === "string" ? payload.identifier.trim() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!identifier || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  let email: string | null = null;

  if (EMAIL_PATTERN.test(identifier)) {
    email = identifier.toLowerCase();
  } else {
    // Resolve a membership username to its global Auth email, server-side only.
    const serviceSupabase = createSupabaseServiceClient();
    const { data: matches, error: lookupError } = await serviceSupabase
      .from("organization_memberships")
      .select(
        "user_id, status, organizations!organization_memberships_organization_id_fkey(status), profiles!organization_memberships_user_id_fkey(status)",
      )
      .ilike("username", escapeLikePattern(identifier))
      .limit(10);

    if (lookupError || !matches || matches.length !== 1) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const match = matches[0] as MembershipMatch;
    const organization = Array.isArray(match.organizations) ? match.organizations[0] : match.organizations;
    const profile = Array.isArray(match.profiles) ? match.profiles[0] : match.profiles;

    if (match.status !== "active" || organization?.status !== "active" || profile?.status !== "active") {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const { data: authUser, error: authUserError } = await serviceSupabase.auth.admin.getUserById(match.user_id);

    if (authUserError || !authUser.user?.email) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    email = authUser.user.email;
  }

  const supabase = await createSupabaseServerClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
