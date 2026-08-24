import { changePasswordWithVerification, forgotPasswordSchema } from "@attendance/shared";
import { createClient } from "@supabase/supabase-js";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getAdminAppUrl } from "./config";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function createVerificationClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Expo Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function changeMobilePassword(
  supabase: SupabaseClient,
  session: Session | null,
  input: {
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  },
) {
  if (!session?.user.email) {
    return {
      success: false as const,
      error: "We couldn't verify your account. Please sign in again.",
    };
  }

  return changePasswordWithVerification({
    email: session.user.email,
    ...input,
    verifyPassword: async ({ email, password }) => {
      const client = createVerificationClient();
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        await client.auth.signOut();
      }

      return { error: error?.message ?? null };
    },
    updatePassword: async ({ password }) => {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error?.message ?? null };
    },
  });
}

export async function requestPasswordReset(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const response = await fetch(`${getAdminAppUrl()}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed.data),
  });

  const result = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

  if (!response.ok) {
    return {
      success: false as const,
      error: result?.error ?? "Unable to send password reset instructions.",
    };
  }

  return {
    success: true as const,
    message: result?.message ?? "If an account exists for that email, we've sent password reset instructions.",
  };
}
