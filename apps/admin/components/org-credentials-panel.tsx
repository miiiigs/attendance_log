"use client";

import { Copy, Key, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ButtonSpinner } from "./button-spinner";

interface CredentialsResult {
  username: string;
  temporaryPassword: string | null;
  onboarding: {
    deliveryStatus: "sent" | "not_configured" | "unavailable" | "failed";
    recipient: string;
    subject: string;
    body: string;
    fullEmail: string;
    reason: string | null;
  };
}

export function OrgCredentialsPanel({
  slug,
  personId,
}: {
  slug: string;
  personId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialsResult | null>(null);
  const [lastMode, setLastMode] = useState<"notify" | "regenerate" | "retry" | null>(null);

  async function handleResendCredentials(mode: "notify" | "regenerate" | "retry" = "regenerate") {
    if (
      mode === "regenerate" &&
      typeof window !== "undefined" &&
      !window.confirm("Generate a new temporary password and invalidate the person's existing password?")
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setSuccess(null);
    setLastMode(mode);

    const response = await fetch(`/api/org/${slug}/people/${personId}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        password: mode === "retry" ? credentials?.temporaryPassword ?? undefined : undefined,
      }),
    });

    const result = (await response.json()) as
      | ({ error?: string } & Partial<CredentialsResult>)
      | ({ onboarding: CredentialsResult["onboarding"] } & CredentialsResult);

    if (!response.ok) {
      setError(("error" in result ? result.error : undefined) ?? "Unable to resend credentials.");
      setLoading(false);
      return;
    }

    setCredentials({
      username: String(result.username ?? ""),
      temporaryPassword: result.temporaryPassword ? String(result.temporaryPassword) : null,
      onboarding: result.onboarding ?? {
        deliveryStatus: "failed",
        recipient: "",
        subject: "",
        body: "",
        fullEmail: "",
        reason: "Automated email could not be prepared.",
      },
    });

    if (result.onboarding?.deliveryStatus !== "sent") {
      setNotice(
        mode === "regenerate"
          ? "A new temporary password was generated, but automated email is not available. Send the prepared email manually or retry the automation."
          : (result.onboarding?.reason ?? "Automated email could not be sent."),
      );
      setLoading(false);
      return;
    }

    setSuccess(
      mode === "notify"
        ? `Sign-in email sent to ${result.onboarding.recipient}.`
        : `New credentials generated successfully. Automated email sent to ${result.onboarding.recipient}.`,
    );
    setLoading(false);
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="mt-5 space-y-4">
      {error ? <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--foreground)]">{notice}</p> : null}
      {success ? <p className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{success}</p> : null}
      {credentials ? (
        <dl className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm">
          <CredentialRow label="Username" value={credentials.username} />
          {credentials.temporaryPassword ? <CredentialRow label="New Temporary Password" value={credentials.temporaryPassword} /> : null}
          <CredentialRow label="Recipient" value={credentials.onboarding.recipient} />
        </dl>
      ) : null}
      {credentials?.onboarding.deliveryStatus === "sent" ? (
        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-4 text-sm text-[var(--accent)]">
          <p className="font-semibold">Onboarding Email Sent</p>
          <p className="mt-1 text-[var(--foreground)]">The onboarding credentials were emailed successfully.</p>
        </div>
      ) : null}
      {credentials && credentials.onboarding.deliveryStatus !== "sent" ? (
        <div className="space-y-4 rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] px-4 py-4 text-sm text-[var(--foreground)]">
          <div>
            <p className="font-semibold text-[var(--warning)]">Automated Email Not Available</p>
            <p className="mt-1">
              {credentials.temporaryPassword
                ? "A new password has already been issued for this person."
                : "The sign-in notification is ready, but automated delivery did not complete."}
            </p>
            <p className="mt-2">Send the following message manually to {credentials.onboarding.recipient}.</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white/75 p-4">
            <EmailPreviewCard
              label="Subject"
              value={credentials.onboarding.subject}
              onCopy={() => copyText(credentials.onboarding.subject).catch(() => undefined)}
            />
            <EmailPreviewCard
              label="Email Body"
              value={credentials.onboarding.body}
              onCopy={() => copyText(credentials.onboarding.body).catch(() => undefined)}
              multiline
            />
          </div>
        </div>
      ) : null}
      {credentials ? (
        <div className="flex flex-wrap gap-3">
          {credentials.onboarding.deliveryStatus !== "sent" ? (
            <button
              type="button"
              onClick={() => handleResendCredentials(credentials.temporaryPassword ? "retry" : "notify").catch(() => undefined)}
              disabled={loading}
              aria-busy={loading}
              className="admin-button disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <ButtonSpinner /> : <RefreshCw className="h-4 w-4" />}
              {loading ? "Retrying..." : "Retry Email"}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleResendCredentials("notify").catch(() => undefined)}
          disabled={loading}
          aria-busy={loading}
          className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && lastMode === "notify" ? <ButtonSpinner /> : <RefreshCw className="h-4 w-4" />}
          {loading && lastMode === "notify" ? "Sending..." : "Send Sign-In Email"}
        </button>
        <button
          type="button"
          onClick={() => handleResendCredentials("regenerate").catch(() => undefined)}
          disabled={loading}
          aria-busy={loading}
          className="admin-button disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && lastMode !== "notify" ? <ButtonSpinner /> : <Key className="h-4 w-4" />}
          {loading && lastMode !== "notify" ? "Generating..." : "Generate New Password"}
        </button>
      </div>
    </div>
  );
}

function EmailPreviewCard({
  label,
  value,
  onCopy,
  multiline = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="admin-field-label">{label}</p>
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {multiline ? (
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--foreground)]">{value}</pre>
      ) : (
        <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{value}</p>
      )}
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-mono text-sm text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
