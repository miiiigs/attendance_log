import { ForgotPasswordForm } from "../../../components/forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[var(--canvas)] px-6 py-12">
      <div className="mx-auto flex min-h-screen max-w-lg items-center">
        <div className="w-full">
          <div className="mb-8">
            <p className="admin-eyebrow">Password recovery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Reset your password</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              We&apos;ll email a secure password reset link if your account is eligible for recovery.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
