import { redirect } from "next/navigation";
import Link from "next/link";
import { ADMIN_PORTAL_NAME, APP_NAME } from "@attendance/shared";
import { AppLogo } from "../../../components/app-logo";
import { LoginForm } from "../../../components/login-form";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <div className="flex min-h-screen">
        <section className="hidden w-[24rem] shrink-0 flex-col justify-between bg-[var(--sidebar)] px-12 py-12 text-white lg:flex">
          <div className="flex items-center gap-3">
            <AppLogo size={48} />
            <div>
              <p className="max-w-[220px] text-sm font-semibold leading-tight">{APP_NAME}</p>
              <p className="mt-1 text-[11px] leading-none text-[rgba(255,255,255,0.36)]">{ADMIN_PORTAL_NAME}</p>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em]">
              Secure attendance.
              <br />
              Multi-organization control.
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-7 text-[rgba(255,255,255,0.48)]">
              Sign in as a platform administrator or current organization administrator to manage people, QR operations, and tenant onboarding from one workspace.
            </p>
          </div>

          <p className="text-xs text-[rgba(255,255,255,0.2)]">© 2026 {APP_NAME}</p>
        </section>

        <section className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <AppLogo size={44} />
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{ADMIN_PORTAL_NAME}</p>
                <p className="text-xs text-[var(--muted)]">{APP_NAME}</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Sign in</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Enter your administrator credentials to continue to the {ADMIN_PORTAL_NAME}. Need a new workspace? Use the
                application link below.
              </p>
            </div>

            <LoginForm />

            <section className="mt-5 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,#fcfaf4_0%,#eef9f1_100%)] p-5 shadow-[0_14px_34px_rgba(22,24,29,0.06)]">
              <p className="admin-eyebrow">Organization onboarding</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                Represent a community or organization?
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Apply for a QRLog workspace to manage your people, activities, and attendance in one place.
              </p>
              <Link href="/apply" className="admin-button mt-4 inline-flex">
                Apply for an organization workspace
              </Link>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
