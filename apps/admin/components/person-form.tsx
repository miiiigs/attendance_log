"use client";

import { personCreateSchema, personUpdateSchema, type PersonCreateInput, type PersonUpdateInput } from "@attendance/shared";
import { AlertTriangle, CheckCircle2, Copy, Key, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PersonFormProps {
  mode: "create" | "edit";
  slug: string;
  person?: Partial<PersonUpdateInput> & { id?: string; username?: string };
}

interface CreatedCredentials {
  personId: string;
  username: string;
  temporaryPassword: string | null;
  existingAccount: boolean;
  onboarding: {
    deliveryStatus: "sent" | "not_configured" | "unavailable" | "failed";
    recipient: string;
    subject: string;
    body: string;
    fullEmail: string;
    reason: string | null;
  };
}

interface CreatePersonResult extends CreatedCredentials {
  success: true;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  };
}

const emptyPerson: PersonCreateInput = {
  firstName: "",
  lastName: "",
  email: "",
};

export function PersonForm({ mode, slug, person }: PersonFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);

  async function handleSubmit(formData: FormData) {
    const payload = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      ...(mode === "edit" ? { status: formData.get("status") } : {}),
    };

    const parsed =
      mode === "create"
        ? personCreateSchema.safeParse(payload)
        : personUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid person input.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const endpoint =
      mode === "create"
        ? `/api/org/${slug}/people`
        : `/api/org/${slug}/people/${person?.id}`;

    const response = await fetch(endpoint, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    if (mode === "create") {
      const result = (await response.json()) as CreatePersonResult | { error?: string };

      if (!response.ok || !("person" in result)) {
        setError(("error" in result ? result.error : undefined) ?? "Unable to create person.");
        setLoading(false);
        return;
      }

      setCreatedCredentials({
        personId: result.person.id,
        username: result.person.username,
        temporaryPassword: result.temporaryPassword,
        existingAccount: !result.temporaryPassword,
        onboarding: {
          deliveryStatus: result.onboarding.deliveryStatus,
          recipient: result.onboarding.recipient,
          subject: result.onboarding.subject,
          body: result.onboarding.body,
          fullEmail: result.onboarding.fullEmail,
          reason: result.onboarding.reason,
        },
      });
    } else {
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to save person.");
        setLoading(false);
        return;
      }

      setSuccess("Person updated successfully.");
    }

    setLoading(false);
    router.refresh();
  }

  async function retryEmail() {
    if (!createdCredentials) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/org/${slug}/people/${createdCredentials.personId}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "retry",
        password: createdCredentials.temporaryPassword,
      }),
    });

    const result = (await response.json()) as {
      onboarding?: CreatedCredentials["onboarding"];
      error?: string;
    };

    if (!response.ok) {
      setError(result.error ?? "Unable to resend onboarding email.");
      setLoading(false);
      return;
    }

    setCreatedCredentials({
      ...createdCredentials,
      onboarding: result.onboarding ?? createdCredentials.onboarding,
    });
    setLoading(false);
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  const automationUnavailable = createdCredentials
    ? createdCredentials.onboarding.deliveryStatus !== "sent"
    : false;

  if (mode === "create" && createdCredentials) {
    return (
      <section className="admin-card space-y-5 p-6">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Person created successfully</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {createdCredentials.existingAccount
              ? "This person already had an account and was added as a member of this organization. No password was changed."
              : "Credentials are ready for delivery and the new account can sign in immediately."}
          </p>
        </div>

        <dl className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm">
          <CredentialRow label="Username" value={createdCredentials.username} />
          {!createdCredentials.existingAccount ? (
            <CredentialRow label="Temporary Password" value={createdCredentials.temporaryPassword ?? ""} />
          ) : null}
          <CredentialRow label="Email" value={createdCredentials.onboarding.recipient} />
        </dl>

        {error ? <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
        {createdCredentials.onboarding.deliveryStatus === "sent" ? (
          <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-4 text-sm text-[var(--accent)]">
            <p className="font-semibold">Onboarding email sent</p>
            <p className="mt-1 text-[var(--foreground)]">
              The onboarding credentials were emailed successfully to {createdCredentials.onboarding.recipient}.
            </p>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] px-4 py-4 text-sm text-[var(--foreground)]">
            <div>
              <p className="font-semibold text-[var(--warning)]">Automated email not available</p>
              <p className="mt-1">The account was created successfully, but automated email delivery is currently unavailable.</p>
              <p className="mt-2">
                You can copy the ready-to-send email below and send it manually to {createdCredentials.onboarding.recipient}.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white/75 p-4">
              <EmailPreviewCard
                label="Subject"
                value={createdCredentials.onboarding.subject}
                onCopy={() => copyText(createdCredentials.onboarding.subject).catch(() => undefined)}
              />
              <EmailPreviewCard
                label="Email Body"
                value={createdCredentials.onboarding.body}
                onCopy={() => copyText(createdCredentials.onboarding.body).catch(() => undefined)}
                multiline
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {automationUnavailable && !createdCredentials.existingAccount ? (
            <button
              type="button"
              onClick={() => retryEmail().catch(() => undefined)}
              disabled={loading}
              className="admin-button disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className="h-4 w-4" />
              {loading ? "Retrying..." : "Retry Email"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.replace(`/org/${slug}/people`)}
            className="admin-button"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <form action={handleSubmit} className="admin-card space-y-5 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name" name="firstName" defaultValue={person?.firstName ?? emptyPerson.firstName} />
        <Field label="Last name" name="lastName" defaultValue={person?.lastName ?? emptyPerson.lastName} />
        <Field label="Email" name="email" type="email" defaultValue={person?.email ?? emptyPerson.email} />
        {mode === "edit" ? (
          <>
            <ReadOnlyField label="Username" value={person?.username ?? ""} />
            <SelectField label="Status" name="status" defaultValue={person?.status ?? "active"} options={["active", "inactive"]} />
          </>
        ) : null}
      </div>

      <p className="text-sm text-[var(--muted)]">
        {mode === "create"
          ? "A username and temporary password will be generated for this organization. If the email already belongs to an existing account, that account is reused without resetting its password."
          : "The username is the person's login identifier within this organization and is read-only after creation."}
      </p>

      {mode === "create" ? (
        <div className="admin-card-flat flex gap-2.5 px-4 py-3.5">
          <Key className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
          <p className="text-xs leading-6 text-[var(--muted)]">
            Credentials are auto-generated during creation and can be copied or emailed immediately after save.
          </p>
        </div>
      ) : (
        <div className="admin-card-flat flex gap-2.5 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          <p className="text-xs leading-6 text-[var(--muted)]">
            Changing the person status affects access right away. Use the credentials panel if the person needs a new password.
          </p>
        </div>
      )}

      {error ? <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{success}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Link href={`/org/${slug}/people`} className="admin-button-secondary">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="admin-button disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Saving..." : mode === "create" ? "Create Person" : "Save Changes"}
        </button>
      </div>
    </form>
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

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="admin-field-label">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="admin-input"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="admin-field-label">{label}</span>
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 font-mono text-sm text-[var(--foreground)]">
        {value}
      </div>
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="admin-field-label">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="admin-select"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
