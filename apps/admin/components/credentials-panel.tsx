"use client";

import { Copy, Key, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";

interface CredentialsResult {
  username: string;
  temporaryPassword: string;
  onboarding: {
    deliveryStatus: "sent" | "not_configured" | "unavailable" | "failed";
    recipient: string;
    subject: string;
    body: string;
    fullEmail: string;
    reason: string | null;
  };
}

export function CredentialsPanel({
  personId,
}: {
  personId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialsResult | null>(null);

  async function handleResendCredentials(mode: "regenerate" | "retry" = "regenerate") {
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

    const response = await fetch(`/api/admin/people/${personId}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        password: mode === "retry" ? credentials?.temporaryPassword : undefined,
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
      temporaryPassword: String(result.temporaryPassword ?? ""),
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
          ? "New credentials generated successfully, but automated email is not available. The password for this person has already been reset. Send the prepared email manually or retry the automation."
          : (result.onboarding?.reason ?? "Automated email could not be sent."),
      );
      setLoading(false);
      return;
    }

    setSuccess(`New credentials generated successfully. Automated email sent to: ${result.onboarding.recipient}.`);
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
          <CredentialRow label="New Temporary Password" value={credentials.temporaryPassword} />
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
            <p className="mt-1">The password for this person has already been reset.</p>
            <p className="mt-2">
              Send the following credentials manually to {credentials.onboarding.recipient}.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white/75 p-4">
            <div>
              <p className="admin-field-label">Subject</p>
              <p className="mt-2">{credentials.onboarding.subject}</p>
            </div>
            <div>
              <p className="admin-field-label">Email Body</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{credentials.onboarding.body}</pre>
            </div>
          </div>
        </div>
      ) : null}
      {credentials ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => copyText(credentials.onboarding.recipient).catch(() => undefined)}
            className="admin-button-secondary"
          >
            <Mail className="h-4 w-4" />
            Copy Email
          </button>
          <button
            type="button"
            onClick={() => copyText(credentials.temporaryPassword).catch(() => undefined)}
            className="admin-button-secondary"
          >
            <Key className="h-4 w-4" />
            Copy Password
          </button>
          <button
            type="button"
            onClick={() =>
              copyText(`Username: ${credentials.username}\nTemporary Password: ${credentials.temporaryPassword}`).catch(() => undefined)
            }
            className="admin-button-secondary"
          >
            <Copy className="h-4 w-4" />
            Copy Credentials
          </button>
          {credentials.onboarding.deliveryStatus !== "sent" ? (
            <>
              <button
                type="button"
                onClick={() => copyText(credentials.onboarding.subject).catch(() => undefined)}
                className="admin-button-secondary"
              >
                <Copy className="h-4 w-4" />
                Copy Subject
              </button>
              <button
                type="button"
                onClick={() => copyText(credentials.onboarding.body).catch(() => undefined)}
                className="admin-button-secondary"
              >
                <Copy className="h-4 w-4" />
                Copy Email Body
              </button>
              <button
                type="button"
                onClick={() => copyText(credentials.onboarding.fullEmail).catch(() => undefined)}
                className="admin-button-secondary"
              >
                <Copy className="h-4 w-4" />
                Copy Full Email
              </button>
              <a
                href={`mailto:${encodeURIComponent(credentials.onboarding.recipient)}?subject=${encodeURIComponent(credentials.onboarding.subject)}&body=${encodeURIComponent(credentials.onboarding.body)}`}
                className="admin-button-secondary"
              >
                <Mail className="h-4 w-4" />
                Open Email App
              </a>
              <button
                type="button"
                onClick={() => handleResendCredentials("retry").catch(() => undefined)}
                disabled={loading}
                className="admin-button disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className="h-4 w-4" />
                {loading ? "Retrying..." : "Retry Email"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => handleResendCredentials("regenerate").catch(() => undefined)}
        disabled={loading}
        className="admin-button disabled:cursor-not-allowed disabled:opacity-70"
      >
        <RefreshCw className="h-4 w-4" />
        {loading ? "Generating..." : "Generate New Credentials"}
      </button>
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
