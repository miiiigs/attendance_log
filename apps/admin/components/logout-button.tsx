"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.74)] transition hover:bg-[rgba(185,28,28,0.16)] hover:text-[#fca5a5]"
    >
      Sign Out
    </button>
  );
}
