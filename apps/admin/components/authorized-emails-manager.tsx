"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailPlus, ShieldCheck, Trash2 } from "lucide-react";
import { ButtonSpinner } from "./button-spinner";

interface Authorization {
  id: string;
  normalized_email: string;
  status: string;
  created_at: string;
  claimed_by: string | null;
}

async function fetchAuthorizations(slug: string) {
  const response = await fetch(`/api/org/${slug}/authorized-emails`, { cache: "no-store" });
  const result = (await response.json().catch(() => null)) as { authorizations?: Authorization[]; error?: string } | null;

  if (!response.ok || !result?.authorizations) {
    return { authorizations: [] as Authorization[], error: result?.error ?? "Unable to load authorized emails." };
  }

  return { authorizations: result.authorizations, error: null };
}

export function AuthorizedEmailsManager({ slug }: { slug: string }) {
  const router = useRouter();
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetchAuthorizations(slug).then((result) => {
      if (!active) {
        return;
      }
      if (result.error) {
        setError(result.error);
      } else {
        setAuthorizations(result.authorizations);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  async function reload() {
    const result = await fetchAuthorizations(slug);
    if (result.error) {
      setError(result.error);
    } else {
      setAuthorizations(result.authorizations);
      setError(null);
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/org/${slug}/authorized-emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;

    if (!response.ok || !result?.ok) {
      setError(result?.error ?? "Unable to authorize the email.");
      setSubmitting(false);
      return;
    }

    setEmail("");
    setNotice("Email authorized.");
    startTransition(() => router.refresh());
    await reload();
    setSubmitting(false);
  }

  async function handleRemove(targetEmail: string) {
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/org/${slug}/authorized-emails?email=${encodeURIComponent(targetEmail)}`, {
      method: "DELETE",
    });
    const result = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;

    if (!response.ok || !result?.ok) {
      setError(result?.error ?? "Unable to remove the authorization.");
      return;
    }

    setNotice("Authorization removed.");
    startTransition(() => router.refresh());
    await reload();
  }

  return (
    <div className="admin-card space-y-4 p-6">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Authorized Member Emails</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Members with these verified emails can join this Community using its code.
          </p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="member@example.com"
          className="admin-input flex-1"
        />
        <button type="submit" disabled={submitting} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
          {submitting ? <ButtonSpinner /> : <MailPlus className="h-4 w-4" />}
          Authorize
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p>
      ) : null}

      {notice ? (
        <p className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{notice}</p>
      ) : null}

      <div className="admin-table-shell">
        {loading ? (
          <p className="px-4 py-3 text-sm text-[var(--muted)]">Loading…</p>
        ) : authorizations.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {authorizations.map((authorization) => (
                  <tr key={authorization.id} className="admin-table-row">
                    <td className="font-mono text-sm text-[var(--foreground)]">{authorization.normalized_email}</td>
                    <td>
                      <span className="admin-chip admin-chip-soft capitalize">{authorization.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemove(authorization.normalized_email)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p className="text-sm font-medium text-[var(--foreground)]">No authorized emails yet.</p>
            <p className="text-xs text-[var(--muted)]">Add an email to let a prospective member join this Community.</p>
          </div>
        )}
      </div>
    </div>
  );
}
