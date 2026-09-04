import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@attendance/shared";
import { AppLogo } from "../../components/app-logo";

export const metadata: Metadata = {
  title: "QRLog Privacy Policy",
  description: "Privacy Policy for QRLog activity tracking accounts and Communities.",
};

const effectiveDate = "September 5, 2026";

const sections = [
  {
    title: "Information users provide",
    body: [
      "Registered users may provide an email address, display name, authentication and account identifiers, and profile information connected to QRLog Communities.",
      "Community accounts may include a Community-specific display name, role, membership status, and related profile details used by Community administrators.",
      "Organization application records may include applicant contact names, contact email addresses, organization names, organization types, estimated member counts, and application messages.",
    ],
  },
  {
    title: "Activity data",
    body: [
      "QRLog stores information needed to operate activity participation, including activity identifiers, Community association where applicable, Time In, Time Out, participation history, and QR scan or audit events.",
      "QRLog uses camera permission on the device to scan QR codes. The current app uses the camera for scanning QR codes and does not store QR camera images as part of the activity record.",
    ],
  },
  {
    title: "Authentication",
    body: [
      "QRLog supports email and password authentication, Google Sign-In when a user selects it, and anonymous Guest authentication through Supabase.",
      "When Google Sign-In is used, Google helps authenticate the account. QRLog does not receive the user's Google password.",
    ],
  },
  {
    title: "How QRLog uses information",
    body: [
      "QRLog uses information to authenticate users, operate QR activities, record participation, provide Community features, maintain account and profile settings, prevent abuse, protect security, and provide support.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "QRLog uses Supabase for authentication, database, and backend infrastructure, Vercel for the web application, and Google authentication when a user selects Google Sign-In.",
      "The current source and configuration do not show advertising, analytics, crash reporting, location, contacts, microphone, photo or media library, push notification, or third-party tracking SDKs in the QRLog mobile app.",
    ],
  },
  {
    title: "Advertising",
    body: ["QRLog does not use user data for advertising based on the current source and configuration."],
  },
  {
    title: "Security",
    body: [
      "QRLog uses reasonable safeguards such as HTTPS encryption in transit, authentication controls, access controls, and tenant or Community authorization boundaries.",
      "No service can guarantee absolute security, but QRLog is designed so user and Community data is accessed only through authorized paths.",
    ],
  },
  {
    title: "Retention and deletion",
    body: [
      "Active account and profile data is retained while needed to provide QRLog. Users can request account deletion at any time.",
      "Some records may need to be retained for legitimate security, fraud-prevention, legal, organizational-recordkeeping, or audit purposes. Where feasible, retained operational records should no longer retain unnecessary personal identifiers after deletion processing.",
      "QRLog processes verified deletion requests within a reasonable period and in accordance with applicable requirements. QRLog may verify identity before processing a request.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions, personal-data inquiries, privacy rights requests, or questions about account or data deletion, contact jmh.leysa@gmail.com.",
      "To request deletion of a QRLog account, use the Account Deletion page. For Community-specific access issues, users may also contact their Community administrator.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <AppLogo size={44} />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{APP_NAME}</p>
              <p className="text-xs text-[var(--muted)]">Privacy and data protection</p>
            </div>
          </Link>
          <Link href="/delete-account" className="admin-button-secondary shrink-0">
            Delete Account
          </Link>
        </header>

        <section className="admin-card p-6 sm:p-8">
          <p className="admin-eyebrow">Effective {effectiveDate}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
            QRLog Privacy Policy
          </h1>
          <p className="mt-5 text-base leading-8 text-[var(--muted)]">
            This Privacy Policy explains how QRLog collects, uses, shares, secures, retains, and deletes information for
            registered accounts, Guest use, public activities, and Communities.
          </p>
          <Link href="/delete-account" className="admin-button mt-6">
            Request account deletion
          </Link>
        </section>

        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="admin-card-flat p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--muted)]">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
