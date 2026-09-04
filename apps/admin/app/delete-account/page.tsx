import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@attendance/shared";
import { AccountDeletionRequestForm } from "../../components/account-deletion-request-form";
import { AppLogo } from "../../components/app-logo";

export const metadata: Metadata = {
  title: "Delete QRLog Account",
  description: "Request deletion of a QRLog account and associated personal profile data.",
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <AppLogo size={44} />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{APP_NAME}</p>
              <p className="text-xs text-[var(--muted)]">Account deletion request</p>
            </div>
          </Link>
          <Link href="/privacy" className="admin-button-secondary shrink-0">
            Privacy Policy
          </Link>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="admin-card p-6 sm:p-8">
            <p className="admin-eyebrow">Delete Account</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
              Request deletion of your QRLog account.
            </h1>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--muted)]">
              <p>
                Enter the email associated with your QRLog account and submit this form. You do not need to reinstall or open the
                mobile app to make this request.
              </p>
              <p>
                QRLog may contact you or otherwise verify account ownership before destructive processing. We use a generic response
                and do not reveal whether an email address is associated with an account.
              </p>
              <p>
                Once verified and processed, the QRLog account and associated personal profile data are deleted. Limited records may
                be retained only where legitimately required, as described in the{" "}
                <Link href="/privacy" className="font-semibold text-[var(--accent)] underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          <AccountDeletionRequestForm />
        </section>
      </div>
    </main>
  );
}
