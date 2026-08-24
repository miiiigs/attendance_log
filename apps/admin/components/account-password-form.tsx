"use client";

import { changePasswordWithVerification } from "@attendance/shared";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { verifyPasswordForEmail } from "../lib/supabase/verify-password";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export function AccountPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("We couldn't verify your account. Please sign in again.");
      setLoading(false);
      return;
    }

    const result = await changePasswordWithVerification({
      email: user.email,
      oldPassword: String(formData.get("oldPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmNewPassword: String(formData.get("confirmNewPassword") ?? ""),
      verifyPassword: ({ email, password }) => verifyPasswordForEmail(email, password),
      updatePassword: async ({ password }) => {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        return { error: updateError?.message ?? null };
      },
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess("Your password was updated successfully.");
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="admin-field-label">Current password</span>
          <input name="oldPassword" type="password" autoComplete="current-password" className="admin-input" />
        </label>
        <label className="block">
          <span className="admin-field-label">New password</span>
          <input name="newPassword" type="password" autoComplete="new-password" className="admin-input" />
        </label>
        <label className="block">
          <span className="admin-field-label">Confirm new password</span>
          <input name="confirmNewPassword" type="password" autoComplete="new-password" className="admin-input" />
        </label>
      </div>

      <p className="text-sm leading-7 text-[var(--muted)]">
        Passwords must be at least 10 characters long. Changing your password updates your Activity Log sign-in everywhere this
        account is used.
      </p>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      ) : null}

      <button type="submit" disabled={loading} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
        {loading ? "Updating..." : "Change Password"}
      </button>
    </form>
  );
}
