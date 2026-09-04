import { displayNameSchema, registerSchema } from "@attendance/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_TAKEN_ERROR, friendlySignUpError, GENERIC_ERROR, logAuthFailure } from "./friendly";

export interface CreateAccountInput {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type CreateAccountResult =
  | { ok: true; requiresEmailConfirmation: boolean }
  | { ok: false; error: string };

/**
 * Fresh self-service account creation (NOT the guest upgrade path).
 *
 * Uses the Supabase new-account flow (`signUp`). When Confirm Email is enabled
 * Supabase returns a user WITHOUT a session; we never claim a session exists.
 * The non-sensitive display name is carried in Auth user metadata so it
 * survives email confirmation and can bootstrap `profiles` after first sign-in.
 * The metadata is never used for authorization.
 */
export async function createAccount(supabase: SupabaseClient, input: CreateAccountInput): Promise<CreateAccountResult> {
  const displayNameParsed = displayNameSchema.safeParse(input.displayName);
  if (!displayNameParsed.success) {
    return { ok: false, error: displayNameParsed.error.issues[0]?.message ?? "Enter a display name." };
  }

  const credentialsParsed = registerSchema.safeParse({
    email: input.email,
    password: input.password,
    confirmPassword: input.confirmPassword,
  });
  if (!credentialsParsed.success) {
    return { ok: false, error: credentialsParsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const displayName = displayNameParsed.data;
  const { email, password } = credentialsParsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        full_name: displayName,
      },
    },
  });

  if (error) {
    logAuthFailure("create-account", error);
    return { ok: false, error: friendlySignUpError(error) };
  }

  // When the email is already in use Supabase returns no new identities and no
  // session. Treat it as "sign in instead" rather than implying a new account.
  const user = data.user ?? null;
  const createdIdentity = Boolean(user) && (user?.identities?.length ?? 0) > 0;
  if (!user || !createdIdentity) {
    return { ok: false, error: EMAIL_TAKEN_ERROR };
  }

  // Confirm Email is enabled for QRLog: signUp returns a user without a
  // session. Only claim success-with-session when Supabase actually returned one.
  return {
    ok: true,
    requiresEmailConfirmation: !data.session,
  };
}
