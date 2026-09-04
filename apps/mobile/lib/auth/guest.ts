import { displayNameSchema } from "@attendance/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyGuestError, GENERIC_ERROR, logAuthFailure } from "./friendly";

export type GuestSessionResult = { ok: true } | { ok: false; error: string };

/**
 * Create the anonymous Auth identity AND the guest profile.
 *
 * This is intentionally an explicit call: it runs only when the user presses
 * "Continue as Guest". Merely viewing a screen never creates an anonymous
 * identity or a profile row.
 */
export async function createGuestSession(
  supabase: SupabaseClient,
  displayName: string,
): Promise<GuestSessionResult> {
  const parsed = displayNameSchema.safeParse(displayName);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a display name." };
  }

  const { error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) {
    logAuthFailure("continue-as-guest (anonymous sign-in)", signInError);
    return { ok: false, error: friendlyGuestError(signInError) };
  }

  const { error: profileError } = await supabase.rpc("create_guest_profile", {
    display_name: parsed.data,
  });

  if (profileError) {
    logAuthFailure("continue-as-guest (profile)", profileError);
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true };
}
