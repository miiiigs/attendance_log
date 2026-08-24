import { forgotPasswordSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOptionalAppBaseUrl, getPublicSupabaseEnv } from "../../../../lib/env";

const GENERIC_MESSAGE = "If an account exists for that email, we've sent password reset instructions.";

export async function POST(request: Request) {
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid email address." }, { status: 400 });
  }

  const env = getPublicSupabaseEnv();
  const appBaseUrl = getOptionalAppBaseUrl() || new URL(request.url).origin;
  const supabase = createClient(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appBaseUrl.replace(/\/$/, "")}/reset-password`,
  });

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
