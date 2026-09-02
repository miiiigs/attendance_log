import { ResetPasswordForm } from "../../../components/reset-password-form";
import { AppLogo } from "../../../components/app-logo";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[var(--canvas)] px-6 py-12">
      <div className="mx-auto flex min-h-screen max-w-lg items-center">
        <div className="w-full">
          <div className="mb-10 flex items-center gap-3">
            <AppLogo size={44} />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">QRLog</p>
              <p className="text-xs text-[var(--muted)]">Password recovery</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="admin-eyebrow">Password recovery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Choose a new password</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Finish your recovery flow here and then sign back in with your updated password.
            </p>
          </div>

          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
