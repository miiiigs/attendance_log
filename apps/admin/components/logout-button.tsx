"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { ButtonSpinner } from "./button-spinner";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isNavigating, startTransition] = useTransition();

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.replace("/login");
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading || isNavigating}
      aria-busy={loading || isNavigating}
      className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.74)] transition hover:bg-[rgba(185,28,28,0.16)] hover:text-[#fca5a5] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading || isNavigating ? (
        <>
          <ButtonSpinner />
          Signing out...
        </>
      ) : (
        "Sign Out"
      )}
    </button>
  );
}
