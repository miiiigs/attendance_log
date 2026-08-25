"use client";

import { resetPasswordWithSession } from "@attendance/shared";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { ButtonSpinner } from "./button-spinner";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function initializeRecovery() {
      const supabase = createSupabaseBrowserClient();
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const recoveryType = searchParams.get("type") || hashParams.get("type");
      const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

      if (errorDescription) {
        if (active) {
          setError(errorDescription);
          setLoading(false);
        }
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          if (active) {
            setError("This password reset link is invalid or expired.");
            setLoading(false);
          }
          return;
        }

        window.history.replaceState({}, "", "/reset-password");
      } else if (tokenHash && recoveryType === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (verifyError) {
          if (active) {
            setError("This password reset link is invalid or expired.");
            setLoading(false);
          }
          return;
        }

        window.history.replaceState({}, "", "/reset-password");
      } else if (accessToken && refreshToken && recoveryType === "recovery") {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          if (active) {
            setError("This password reset link is invalid or expired.");
            setLoading(false);
          }
          return;
        }

        window.history.replaceState({}, "", "/reset-password");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (!session) {
        setError("This password reset link is invalid or expired.");
        setLoading(false);
        return;
      }

      setReady(true);
      setLoading(false);
    }

    initializeRecovery().catch(() => {
      if (active) {
        setError("This password reset link is invalid or expired.");
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    const supabase = createSupabaseBrowserClient();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await resetPasswordWithSession({
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmNewPassword: String(formData.get("confirmNewPassword") ?? ""),
      updatePassword: async ({ password }) => {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        return { error: updateError?.message ?? null };
      },
    });

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setSuccess("Your password has been reset. Redirecting you to login...");
    await supabase.auth.signOut();
    setSubmitting(false);
    setTimeout(() => {
      router.replace("/login?reset=success");
    }, 900);
  }

  if (loading) {
    return (
      <div className="admin-card p-7 sm:p-8">
        <p className="text-sm text-[var(--muted)]">Checking your password reset session…</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="admin-card space-y-5 p-7 sm:p-8">
      <div className="space-y-4">
        <label className="block">
          <span className="admin-field-label">New password</span>
          <input name="newPassword" type="password" autoComplete="new-password" className="admin-input" disabled={!ready} />
        </label>
        <label className="block">
          <span className="admin-field-label">Confirm new password</span>
          <input name="confirmNewPassword" type="password" autoComplete="new-password" className="admin-input" disabled={!ready} />
        </label>
      </div>

      <p className="text-sm leading-7 text-[var(--muted)]">Choose a new password with at least 10 characters.</p>

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

      <button
        type="submit"
        disabled={!ready || submitting}
        aria-busy={submitting}
        className="admin-button disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? (
          <>
            <ButtonSpinner />
            Updating...
          </>
        ) : (
          "Reset Password"
        )}
      </button>
    </form>
  );
}
