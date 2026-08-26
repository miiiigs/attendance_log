"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ButtonSpinner } from "./button-spinner";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!identifier || password.length < 1) {
      setError("Enter your username or email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(result?.error ?? "Invalid username/email or password.");
      setLoading(false);
      return;
    }

    startTransition(() => {
      router.replace("/");
    });
  }

  return (
    <form
      action={handleSubmit}
      className="admin-card space-y-4 p-7 sm:p-8"
    >
      <div>
        <label className="admin-field-label" htmlFor="identifier">
          Username or Email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          className="admin-input"
          placeholder="SCPPA_admin_1 or name@example.com"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="admin-field-label" htmlFor="password">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--foreground)]">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="admin-input pr-11"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9da3ad] transition hover:text-[var(--foreground)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || isNavigating}
        aria-busy={loading || isNavigating}
        className="admin-button mt-2 w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading || isNavigating ? (
          <>
            <ButtonSpinner />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
