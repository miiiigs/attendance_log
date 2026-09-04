import { displayNameSchema } from "@attendance/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export const GENERIC_DISPLAY_NAME_ERROR = "Unable to update your display name. Please try again.";

export type DisplayNameValidation = { ok: true; value: string } | { ok: false; error: string };

export type DisplayNameResult = { ok: true } | { ok: false; error: string };

export function validateDisplayName(input: string): DisplayNameValidation {
  const parsed = displayNameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a display name." };
  }

  return { ok: true, value: parsed.data };
}

function isErrorLike(reason: unknown): reason is { message?: string } {
  return typeof reason === "object" && reason !== null && "message" in reason;
}

export function friendlyDisplayNameError(reason: unknown): string {
  const message = isErrorLike(reason) && typeof reason.message === "string" ? reason.message : "";

  if (message.toLowerCase().includes("inactive")) {
    return "Your account is inactive, so your display name cannot be changed.";
  }
  if (message.toLowerCase().includes("not an active member")) {
    return "You are not an active member of this Community.";
  }
  if (message.toLowerCase().includes("display name")) {
    return message;
  }

  return GENERIC_DISPLAY_NAME_ERROR;
}

/**
 * Update the caller's GLOBAL QRLog display name (profiles.display_name) via the
 * server-authoritative RPC. Never touches email, role, status, or username.
 */
export async function updateGlobalDisplayName(
  supabase: SupabaseClient,
  input: string,
): Promise<DisplayNameResult> {
  const validation = validateDisplayName(input);
  if (!validation.ok) {
    return validation;
  }

  const { error } = await supabase.rpc("update_profile_display_name", {
    new_display_name: validation.value,
  });

  if (error) {
    return { ok: false, error: friendlyDisplayNameError(error) };
  }

  return { ok: true };
}

/**
 * Update the caller's own Community-scoped display name
 * (organization_memberships.display_name) via the server-authoritative RPC.
 * There is no membership/user parameter, so another member can never be edited.
 */
export async function updateCommunityDisplayName(
  supabase: SupabaseClient,
  organizationId: string,
  input: string,
): Promise<DisplayNameResult> {
  const validation = validateDisplayName(input);
  if (!validation.ok) {
    return validation;
  }

  const { error } = await supabase.rpc("update_own_community_display_name", {
    target_organization_id: organizationId,
    new_display_name: validation.value,
  });

  if (error) {
    return { ok: false, error: friendlyDisplayNameError(error) };
  }

  return { ok: true };
}
