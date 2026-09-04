"use client";

import { useState } from "react";

const SUCCESS_MESSAGE =
  "If this email is associated with a QRLog account, your deletion request has been recorded. We may contact you to verify ownership before processing it.";

export function AccountDeletionRequestForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/account-deletion-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "web" }),
    });

    const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

    if (!response.ok) {
      setError(body.error ?? "We could not record the request. Please try again later.");
      setLoading(false);
      return;
    }

    setEmail("");
    setSuccess(body.message ?? SUCCESS_MESSAGE);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card space-y-5 p-5 sm:p-6">
      <div>
        <label className="admin-field-label" htmlFor="deletion-email">
          Email address
        </label>
        <input
          id="deletion-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="admin-input"
          placeholder="you@example.com"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm leading-6 text-[var(--accent)]">
          {success}
        </div>
      ) : null}

      <button type="submit" className="admin-button w-full" disabled={loading}>
        {loading ? "Submitting..." : "Request account deletion"}
      </button>
    </form>
  );
}
