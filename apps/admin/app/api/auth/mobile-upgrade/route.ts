import { registerSchema } from "@attendance/shared";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "../../../../lib/env";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

const GENERIC_ERROR = "Unable to register. Please try again.";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? GENERIC_ERROR }, { status: 400 });
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "") ?? null;

  if (!accessToken) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const env = getPublicSupabaseEnv();

  // Validate the current (anonymous) session without the service role so we
  // never upgrade an arbitrary identity. The token itself identifies the user.
  const userClient = createClient(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  // Only guests upgrade here; a registered user already has an email.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.email) {
    return NextResponse.json({ error: "This account is already registered." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    email,
    password,
    email_confirm: true,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message ?? GENERIC_ERROR }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ email })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message ?? GENERIC_ERROR }, { status: 400 });
  }

  // Issue a fresh session for the now-registered identity.
  const authResponse = await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
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

  if (!authResponse.ok || !authResult.access_token || !authResult.refresh_token) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
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
