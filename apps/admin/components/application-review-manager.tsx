"use client";

import { DEFAULT_TIMEZONE } from "@attendance/shared";
import { useState } from "react";
import { normalizeOrganizationCode } from "../lib/organizations";

type ApplicationItem = {
  id: string;
  organizationName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  organizationType: string | null;
  estimatedMemberCount: number | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  createdAt: string;
  suggestedCode: string;
  suggestedTimezone: string;
};

type ReviewDraft = {
  organizationName: string;
  organizationCode: string;
  timezone: string;
  administratorFirstName: string;
  administratorLastName: string;
  administratorEmail: string;
};

type FeedbackState = {
  kind: "success" | "error";
  message: string;
  onboarding?: {
    deliveryStatus: string;
    recipient: string;
    subject: string;
    body: string;
    fullEmail: string;
    reason: string | null;
  };
  organization?: {
    id: string;
    code: string;
  };
  administrator?: {
    name: string;
    email: string;
    username: string;
  };
  temporaryPassword?: string | null;
  usedExistingAccount?: boolean;
};

function buildInitialDraft(application: ApplicationItem): ReviewDraft {
  return {
    organizationName: application.organizationName,
    organizationCode: application.suggestedCode,
    timezone: application.suggestedTimezone || DEFAULT_TIMEZONE,
    administratorFirstName: application.contactFirstName,
    administratorLastName: application.contactLastName,
    administratorEmail: application.contactEmail,
  };
}

function statusChip(status: ApplicationItem["status"]) {
  if (status === "approved") {
    return "admin-chip admin-chip-success";
  }

  if (status === "rejected") {
    return "admin-chip admin-chip-danger";
  }

  return "admin-chip admin-chip-warning";
}

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

export function ApplicationReviewManager({ applications }: { applications: ApplicationItem[] }) {
  const [items, setItems] = useState(applications);
  const [activeId, setActiveId] = useState<string | null>(applications.find((application) => application.status === "pending")?.id ?? null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>(
    Object.fromEntries(applications.map((application) => [application.id, buildInitialDraft(application)])),
  );
  const [feedbackById, setFeedbackById] = useState<Record<string, FeedbackState>>({});

  function updateDraft(id: string, field: keyof ReviewDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? buildInitialDraft(items.find((application) => application.id === id)!)),
        [field]: field === "organizationCode" ? normalizeOrganizationCode(value) : value,
      },
    }));
  }

  async function handleApprove(id: string) {
    setSubmittingId(id);
    setFeedbackById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    const response = await fetch(`/api/platform/applications/${id}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(drafts[id]),
    });

    const result = (await response.json().catch(() => null)) as
      | {
          error?: string;
          onboarding?: FeedbackState["onboarding"];
          organization?: { id: string; code: string };
          administrator?: { name: string; email: string; username: string };
          temporaryPassword?: string | null;
          usedExistingAccount?: boolean;
        }
      | null;

    if (!response.ok) {
      setFeedbackById((current) => ({
        ...current,
        [id]: {
          kind: "error",
          message: result?.error ?? "Unable to approve the application.",
        },
      }));
      setSubmittingId(null);
      return;
    }

    setItems((current) =>
      current.map((application) =>
        application.id === id
          ? {
              ...application,
              status: "approved",
              reviewedAt: new Date().toISOString(),
            }
          : application,
      ),
    );
    setFeedbackById((current) => ({
      ...current,
      [id]: {
        kind: "success",
        message: `Organization approved. ${result?.organization?.code ?? "Credentials"} created successfully.`,
        onboarding: result?.onboarding,
        organization: result?.organization,
        administrator: result?.administrator,
        temporaryPassword: result?.temporaryPassword,
        usedExistingAccount: result?.usedExistingAccount ?? false,
      },
    }));
    setSubmittingId(null);
  }

  async function handleReject(id: string) {
    const confirmed = window.confirm("Reject this organization application? No organization or membership will be created.");
    if (!confirmed) {
      return;
    }

    setSubmittingId(id);
    setFeedbackById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    const response = await fetch(`/api/platform/applications/${id}/reject`, {
      method: "POST",
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setFeedbackById((current) => ({
        ...current,
        [id]: {
          kind: "error",
          message: result?.error ?? "Unable to reject the application.",
        },
      }));
      setSubmittingId(null);
      return;
    }

    setItems((current) =>
      current.map((application) =>
        application.id === id
          ? {
              ...application,
              status: "rejected",
              reviewedAt: new Date().toISOString(),
            }
          : application,
      ),
    );
    setFeedbackById((current) => ({
      ...current,
      [id]: {
        kind: "success",
        message: "Application rejected.",
      },
    }));
    setSubmittingId(null);
  }

  if (!items.length) {
    return (
      <div className="admin-card p-6">
        <p className="text-sm text-[var(--muted)]">No applications match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((application) => {
        const draft = drafts[application.id] ?? buildInitialDraft(application);
        const feedback = feedbackById[application.id];
        const isOpen = activeId === application.id;
        const isSubmitting = submittingId === application.id;

        return (
          <article key={application.id} className="admin-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{application.organizationName}</h2>
                  <span className={statusChip(application.status)}>{application.status}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {application.contactFirstName} {application.contactLastName} · {application.contactEmail}
                </p>
                <p className="text-sm leading-7 text-[var(--muted)]">
                  Submitted {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(application.createdAt))}
                </p>
                {application.organizationType || application.estimatedMemberCount ? (
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    {[application.organizationType, application.estimatedMemberCount ? `${application.estimatedMemberCount} estimated members` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                {application.message ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{application.message}</p> : null}
              </div>

              {application.status === "pending" ? (
                <div className="flex gap-2">
                  <button type="button" className="admin-button-secondary" onClick={() => setActiveId(isOpen ? null : application.id)}>
                    {isOpen ? "Hide Review" : "Review"}
                  </button>
                  <button type="button" className="admin-button-danger" onClick={() => handleReject(application.id)} disabled={isSubmitting}>
                    {isSubmitting ? "Working..." : "Reject"}
                  </button>
                </div>
              ) : null}
            </div>

            {isOpen && application.status === "pending" ? (
              <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="admin-field-label" htmlFor={`organization-name-${application.id}`}>
                    Organization Name
                  </label>
                  <input
                    id={`organization-name-${application.id}`}
                    className="admin-input"
                    value={draft.organizationName}
                    onChange={(event) => updateDraft(application.id, "organizationName", event.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-field-label" htmlFor={`organization-code-${application.id}`}>
                    Organization Code
                  </label>
                  <input
                    id={`organization-code-${application.id}`}
                    className="admin-input"
                    value={draft.organizationCode}
                    onChange={(event) => updateDraft(application.id, "organizationCode", event.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-field-label" htmlFor={`organization-timezone-${application.id}`}>
                    Timezone
                  </label>
                  <input
                    id={`organization-timezone-${application.id}`}
                    className="admin-input"
                    value={draft.timezone}
                    onChange={(event) => updateDraft(application.id, "timezone", event.target.value)}
                    placeholder="Asia/Manila"
                  />
                </div>
                <div>
                  <label className="admin-field-label" htmlFor={`administrator-first-name-${application.id}`}>
                    Administrator First Name
                  </label>
                  <input
                    id={`administrator-first-name-${application.id}`}
                    className="admin-input"
                    value={draft.administratorFirstName}
                    onChange={(event) => updateDraft(application.id, "administratorFirstName", event.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-field-label" htmlFor={`administrator-last-name-${application.id}`}>
                    Administrator Last Name
                  </label>
                  <input
                    id={`administrator-last-name-${application.id}`}
                    className="admin-input"
                    value={draft.administratorLastName}
                    onChange={(event) => updateDraft(application.id, "administratorLastName", event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="admin-field-label" htmlFor={`administrator-email-${application.id}`}>
                    Administrator Email
                  </label>
                  <input
                    id={`administrator-email-${application.id}`}
                    className="admin-input"
                    type="email"
                    value={draft.administratorEmail}
                    onChange={(event) => updateDraft(application.id, "administratorEmail", event.target.value)}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" className="admin-button" onClick={() => handleApprove(application.id)} disabled={isSubmitting}>
                    {isSubmitting ? "Approving..." : "Approve Organization"}
                  </button>
                </div>
              </div>
            ) : null}

            {feedback ? (
              <div
                className={`mt-5 rounded-2xl px-4 py-4 text-sm ${
                  feedback.kind === "success"
                    ? "border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                    : "border border-[#fecaca] bg-[var(--danger-soft)] text-[var(--danger)]"
                }`}
              >
                <p className="font-semibold">{feedback.message}</p>

                {feedback.kind === "success" && feedback.organization && feedback.administrator ? (
                  <div className="mt-3 grid gap-3 text-sm text-[var(--foreground)] md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Organization Code</p>
                      <p className="mt-1 font-mono">{feedback.organization.code}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Administrator</p>
                      <p className="mt-1">{feedback.administrator.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Username</p>
                      <p className="mt-1 font-mono">{feedback.administrator.username}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Password</p>
                      <p className="mt-1 font-mono">
                        {feedback.usedExistingAccount
                          ? "Existing QRLog password"
                          : feedback.temporaryPassword ?? "Delivered securely by email"}
                      </p>
                    </div>
                    {feedback.usedExistingAccount ? (
                      <p className="md:col-span-2 text-sm text-[var(--muted)]">
                        Existing QRLog account reused. No password reset was performed.
                      </p>
                    ) : feedback.temporaryPassword ? (
                      <p className="md:col-span-2 text-sm text-[var(--muted)]">
                        Temporary password exposure is limited to this immediate manual fallback because automated email delivery did
                        not complete.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {feedback.onboarding ? (
                  <div className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
                    <p>
                      Delivery status: <strong>{feedback.onboarding.deliveryStatus}</strong>
                    </p>
                    <p>
                      Recipient: <strong>{feedback.onboarding.recipient}</strong>
                    </p>
                    {feedback.onboarding.reason ? <p>{feedback.onboarding.reason}</p> : null}
                    {feedback.onboarding.deliveryStatus !== "sent" ? (
                      <div className="admin-card-flat p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Manual email fallback</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="admin-button-secondary"
                            onClick={() => copyToClipboard(feedback.onboarding?.subject ?? "")}
                          >
                            Copy Subject
                          </button>
                          <button
                            type="button"
                            className="admin-button-secondary"
                            onClick={() => copyToClipboard(feedback.onboarding?.body ?? "")}
                          >
                            Copy Email Body
                          </button>
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Subject</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{feedback.onboarding.subject}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Body</p>
                        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-6 text-[var(--foreground)]">
                          {feedback.onboarding.body}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
