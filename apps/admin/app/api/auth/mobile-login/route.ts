import { personLoginSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "../../../../lib/env";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

export async function POST(request: Request) {
  const parsed = personLoginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid login details." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role, status")
    .eq("username", parsed.data.username)
    .eq("role", "person")
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  if (profile.status !== "active") {
    return NextResponse.json({ error: "Your account is inactive." }, { status: 403 });
  }

  const env = getPublicSupabaseEnv();
  const authResponse = await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: profile.email,
      password: parsed.data.password,
    }),
  });

  const authResult = await authResponse.json();

  if (!authResponse.ok) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  return NextResponse.json({
    access_token: authResult.access_token,
    refresh_token: authResult.refresh_token,
    expires_in: authResult.expires_in,
    expires_at: authResult.expires_at,
    token_type: authResult.token_type,
    user: authResult.user,
  });
}
