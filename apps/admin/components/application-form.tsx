"use client";

import Link from "next/link";
import { useState } from "react";
import { ButtonSpinner } from "./button-spinner";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success" };

const initialState: SubmissionState = { kind: "idle" };

export function ApplicationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>(initialState);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setSubmissionState(initialState);

    const payload = {
      organizationName: String(formData.get("organizationName") ?? ""),
      contactFirstName: String(formData.get("contactFirstName") ?? ""),
      contactLastName: String(formData.get("contactLastName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      organizationType: String(formData.get("organizationType") ?? ""),
      estimatedMemberCount: String(formData.get("estimatedMemberCount") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const response = await fetch("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setSubmissionState({
        kind: "error",
        message: result?.error ?? "Unable to submit your application right now.",
      });
      setSubmitting(false);
      return;
    }

    setSubmissionState({ kind: "success" });
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="admin-card space-y-5 p-6 sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="admin-field-label" htmlFor="organizationName">
              Organization / Group Name
            </label>
            <input id="organizationName" name="organizationName" className="admin-input" placeholder="South Cotabato Youth Volunteers" />
          </div>

          <div>
            <label className="admin-field-label" htmlFor="contactFirstName">
              Contact First Name
            </label>
            <input id="contactFirstName" name="contactFirstName" className="admin-input" placeholder="Maria" />
          </div>

          <div>
            <label className="admin-field-label" htmlFor="contactLastName">
              Contact Last Name
            </label>
            <input id="contactLastName" name="contactLastName" className="admin-input" placeholder="Santos" />
          </div>

          <div>
            <label className="admin-field-label" htmlFor="contactEmail">
              Contact Email
            </label>
            <input id="contactEmail" name="contactEmail" type="email" className="admin-input" placeholder="admin@example.org" />
          </div>

          <div>
            <label className="admin-field-label" htmlFor="organizationType">
              Organization Type
            </label>
            <input id="organizationType" name="organizationType" className="admin-input" placeholder="Community association" />
          </div>

          <div>
            <label className="admin-field-label" htmlFor="estimatedMemberCount">
              Estimated Number of Members
            </label>
            <input
              id="estimatedMemberCount"
              name="estimatedMemberCount"
              type="number"
              min={1}
              step={1}
              className="admin-input"
              placeholder="150"
            />
          </div>

          <div className="md:col-span-2">
            <label className="admin-field-label" htmlFor="message">
              Short Message / Purpose
            </label>
            <textarea
              id="message"
              name="message"
              className="admin-textarea"
              placeholder="Tell us what kind of activities your organization wants to track."
            />
          </div>
        </div>

        {submissionState.kind === "error" ? (
          <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {submissionState.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="admin-inline-note">
            Submission creates a review request only. Your organization will be activated after manual platform approval.
          </p>
          <button type="submit" disabled={submitting} aria-busy={submitting} className="admin-button min-w-[190px]">
            {submitting ? (
              <>
                <ButtonSpinner />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </button>
        </div>
      </form>

      {submissionState.kind === "success" ? (
        <div className="admin-card border-[var(--accent-border)] bg-[var(--accent-soft)] p-6">
          <p className="admin-eyebrow text-[var(--accent)]">Application Submitted</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Your request is now in the review queue.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            The platform administrator will review your organization details and approve or reject the request. If approved, your
            first admin will receive organization credentials and onboarding instructions.
          </p>
          <div className="mt-5">
            <Link href="/login" className="admin-button-secondary">
              Return to admin sign in
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
