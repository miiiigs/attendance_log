"use client";

import { personCreateSchema } from "@attendance/shared";
import { CheckCircle2, Key, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ButtonSpinner } from "./button-spinner";

interface AdminResult {
  mode: "created" | "added" | "promoted";
  administrator: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  };
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

export function AddOrganizationAdmin({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const parsed = personCreateSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid administrator input.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/platform/organizations/${organizationId}/admins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const body = (await response.json().catch(() => null)) as (AdminResult & { error?: string }) | null;

    if (!response.ok || !body || !("mode" in body)) {
      setError(body?.error ?? "Unable to add organization administrator.");
      setLoading(false);
      return;
    }

    setResult(body);
    setLoading(false);
    startTransition(() => {
      router.refresh();
    });
  }

  function closeResult() {
    setResult(null);
    setOpen(false);
    setError(null);
  }

  if (result) {
    const emailSent = result.onboarding.deliveryStatus === "sent";

    return (
      <section className="admin-card space-y-5 p-6">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            {result.mode === "promoted"
              ? "Member promoted to organization administrator"
              : result.mode === "added"
                ? "Existing user added as organization administrator"
                : "Organization administrator created"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {result.mode === "promoted"
              ? "The existing membership was promoted to organization administrator. No password was changed."
              : result.mode === "added"
                ? "The existing QRLog account was added as an organization administrator. No password was changed."
                : emailSent
                  ? "The new account was created and the sign-in details were delivered securely by email."
                  : "The new account was created, but automated delivery is unavailable right now."}
          </p>
        </div>

        <dl className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm">
          <Row label="Name" value={`${result.administrator.firstName} ${result.administrator.lastName}`.trim()} />
          <Row label="Username" value={result.administrator.username} />
          {result.temporaryPassword ? <Row label="Temporary Password" value={result.temporaryPassword} /> : null}
          <Row label="Email" value={result.administrator.email} />
        </dl>

        <div
          className={
            emailSent
              ? "rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-4 text-sm text-[var(--foreground)]"
              : "rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] px-4 py-4 text-sm text-[var(--foreground)]"
          }
        >
          <p className={`font-semibold ${emailSent ? "text-[var(--accent)]" : "text-[var(--warning)]"}`}>
            {emailSent ? "Onboarding email sent" : "Automated email not available"}
          </p>
          <p className="mt-1">
            {emailSent
              ? `The administrator credentials were emailed to ${result.onboarding.recipient}.`
              : `Copy the temporary password above and deliver it securely to ${result.onboarding.recipient}.`}
          </p>
        </div>

        <button type="button" onClick={closeResult} className="admin-button">
          Done
        </button>
      </section>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="admin-button-secondary">
        <UserPlus className="h-4 w-4" />
        Add Organization Admin
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="admin-card space-y-5 p-6">
      <div>
        <p className="admin-eyebrow">Add Organization Admin</p>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Create a new administrator, add an existing QRLog user, or promote an existing member. Existing accounts keep their
          current password.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="admin-field-label">First name</span>
          <input name="firstName" className="admin-input" required />
        </label>
        <label className="block">
          <span className="admin-field-label">Last name</span>
          <input name="lastName" className="admin-input" required />
        </label>
        <label className="block md:col-span-2">
          <span className="admin-field-label">Email</span>
          <input name="email" type="email" className="admin-input" required />
        </label>
      </div>

      <div className="admin-card-flat flex gap-2.5 px-4 py-3.5">
        <Key className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
        <p className="text-xs leading-6 text-[var(--muted)]">
          A membership username is generated for this organization. New global users receive a temporary password by email.
        </p>
      </div>

      {error ? <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="admin-button-secondary"
        >
          Cancel
        </button>
        <button type="submit" disabled={loading} aria-busy={loading} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? (
            <>
              <ButtonSpinner />
              Creating...
            </>
          ) : (
            "Add Organization Admin"
          )}
        </button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-mono text-sm text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
