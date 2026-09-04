import { emailAddressSchema } from "@attendance/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_TAKEN_ERROR, GENERIC_ERROR, logAuthFailure } from "./friendly";

export type GuestUpgradeResult = { ok: true } | { ok: false; error: string };
export type GuestVerificationResult =
  | { ok: true; verified: boolean }
  | { ok: false; error: string };

/**
 * Guest → permanent upgrade, step 1: claim an email on the EXISTING anonymous
 * Auth identity with `updateUser`. This intentionally reuses the same
 * user.id / activity history and is a DIFFERENT context from fresh `signUp`.
 */
export async function submitGuestUpgradeEmail(supabase: SupabaseClient, email: string): Promise<GuestUpgradeResult> {
  const parsed = emailAddressSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const { error } = await supabase.auth.updateUser({ email: parsed.data });
  if (error) {
    logAuthFailure("guest-upgrade (email)", error);
    const message = error.message.toLowerCase();
    if (message.includes("already") || message.includes("exists") || message.includes("registered")) {
      return { ok: false, error: EMAIL_TAKEN_ERROR };
    }
    return { ok: false, error: error.message || GENERIC_ERROR };
  }

  return { ok: true };
}

/**
 * Guest → permanent upgrade, step 2: confirm the email was verified before
 * allowing a password to be set.
 */
export async function checkGuestEmailVerification(supabase: SupabaseClient): Promise<GuestVerificationResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  return { ok: true, verified: Boolean(user.email_confirmed_at) };
}

/**
 * Guest → permanent upgrade, step 3: set a password on the SAME Auth identity
 * and sync the verified Auth email into `profiles.email` (display data only).
 * The guest's activity history is preserved because the user.id never changes.
 */
export async function finishGuestUpgrade(supabase: SupabaseClient, password: string): Promise<GuestUpgradeResult> {
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    logAuthFailure("guest-upgrade (password)", passwordError);
    return { ok: false, error: passwordError.message || "Unable to set your password." };
  }

  const { error: syncError } = await supabase.rpc("sync_profile_email");
  if (syncError) {
    logAuthFailure("guest-upgrade (email sync)", syncError);
    return { ok: false, error: syncError.message || "Unable to finish registration." };
  }

  return { ok: true };
}
