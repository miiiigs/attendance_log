import { Building2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@attendance/shared";
import { ApplicationForm } from "../../components/application-form";

export const dynamic = "force-dynamic";

const highlights = [
  {
    title: "Managed approval",
    description: "Every organization request is reviewed before a workspace is activated.",
    icon: ShieldCheck,
  },
  {
    title: "Generic mobile app",
    description: "Approved members sign in with organization code, username, and password using one shared app.",
    icon: Building2,
  },
  {
    title: "Operational onboarding",
    description: "Admins receive generated organization credentials plus an email fallback when automation is unavailable.",
    icon: ClipboardCheck,
  },
];

export default function ApplyPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="admin-card overflow-hidden p-6 sm:p-8">
            <p className="admin-eyebrow">Apply for Access</p>
            <h1 className="mt-4 text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[var(--foreground)]">
              Bring your organization into {APP_NAME}.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-[var(--muted)]">
              Submit your organization request, tell us who should receive the first administrator credentials, and we will review
              the workspace before it goes live.
            </p>

            <div className="mt-8 grid gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="admin-card-flat flex items-start gap-4 p-4">
                    <div className="admin-icon-badge h-11 w-11 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-1 text-sm leading-7 text-[var(--muted)]">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ApplicationForm />
        </section>
      </div>
    </main>
  );
}
