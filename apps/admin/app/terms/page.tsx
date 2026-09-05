import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@attendance/shared";
import { AppLogo } from "../../components/app-logo";

export const metadata: Metadata = {
  title: "QRLog Terms of Use",
  description: "Terms of Use and Acceptable Use Policy for QRLog.",
};

const effectiveDate = "September 5, 2026";

const prohibited = [
  "child sexual abuse, exploitation, or endangerment",
  "sexually explicit or pornographic material",
  "threats, promotion of violence, harassment, or bullying",
  "hate, abusive, or demeaning content",
  "illegal, dangerous, or harmful activity",
  "impersonation, scams, fraud, or deceptive content",
  "spam, malware, malicious links, or attempts to disrupt QRLog",
  "another person's sensitive or private information",
  "content that infringes intellectual-property rights",
  "content prohibited by applicable law or Google Play policy",
];

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <AppLogo size={44} />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{APP_NAME}</p>
              <p className="text-xs text-[var(--muted)]">Terms and acceptable use</p>
            </div>
          </Link>
          <Link href="/privacy" className="admin-button-secondary shrink-0">
            Privacy Policy
          </Link>
        </header>

        <section className="admin-card p-6 sm:p-8">
          <p className="admin-eyebrow">Effective {effectiveDate}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
            QRLog Terms of Use
          </h1>
          <p className="mt-5 text-base leading-8 text-[var(--muted)]">
            QRLog is a QR-based activity and attendance logging tool. By using QRLog, you are responsible for the activity
            names, organization information, and other content you create or manage.
          </p>
        </section>

        <section className="admin-card-flat p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Terms of Use</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p>
              Use QRLog only for legitimate activity participation, attendance, and organization operations. Keep your account
              credentials secure and do not use another person&apos;s account.
            </p>
            <p>
              Community administrators are responsible for managing their organization, member access, activity names, QR
              availability, and any user-created activity content under their Community.
            </p>
            <p>
              QRLog may review reports, hide or remove violating activity content, suspend access, or take other appropriate
              action when content or behavior violates these Terms, applicable law, or platform policy.
            </p>
            <p>
              These Terms may be updated as QRLog changes. For support or policy questions, contact jmh.leysa@gmail.com.
            </p>
          </div>
        </section>

        <section className="admin-card-flat p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Acceptable Use / UGC Rules</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Activity names and related user-created content must not include or promote:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">
            {prohibited.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p>
              Users can report objectionable Activity content or organizers from within QRLog. Reports may be reviewed,
              dismissed, hidden, removed, or otherwise actioned.
            </p>
            <p>
              Do not create Activity names or content that you do not have the right to use, or that would make QRLog unsafe,
              deceptive, abusive, or unlawful for other users.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
