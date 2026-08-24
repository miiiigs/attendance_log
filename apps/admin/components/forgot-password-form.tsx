"use client";

import { forgotPasswordSchema } from "@attendance/shared";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    const parsed = forgotPasswordSchema.safeParse({
      email: formData.get("email"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const result = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

    if (!response.ok) {
      setError(result?.error ?? "Unable to send password reset instructions.");
      setLoading(false);
      return;
    }

    setSuccess(result?.message ?? "If an account exists for that email, we've sent password reset instructions.");
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="admin-card space-y-5 p-7 sm:p-8">
      <div>
        <label className="admin-field-label" htmlFor="email">
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className="admin-input" placeholder="you@example.com" />
      </div>

      <p className="text-sm leading-7 text-[var(--muted)]">
        Enter the email address associated with your QRLog account and we&apos;ll send you a secure reset link.
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

      <div className="flex flex-wrap gap-3">
        <Link href="/login" className="admin-button-secondary">
          Back to login
        </Link>
        <button type="submit" disabled={loading} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? "Sending..." : "Send Reset Instructions"}
        </button>
      </div>
    </form>
  );
}
