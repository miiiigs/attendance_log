"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, ClipboardList, LayoutDashboard, LogOut, Menu, ShieldCheck, UserCircle2, X } from "lucide-react";
import { ADMIN_PORTAL_NAME, APP_NAME, getFullName } from "@attendance/shared";
import { AppLogo } from "./app-logo";
import { LogoutButton } from "./logout-button";

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: ClipboardList },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <AppLogo size={44} />
      <div>
        <p className="text-sm font-semibold text-white">{APP_NAME}</p>
        <p className="mt-1 text-[11px] leading-none text-[rgba(255,255,255,0.42)]">{ADMIN_PORTAL_NAME}</p>
      </div>
    </div>
  );
}

function SidebarContent({
  mobile = false,
  name,
  pathname,
  onClose,
}: {
  mobile?: boolean;
  name: string;
  pathname: string;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)] text-white">
      <div className="flex items-center justify-between px-5 pb-6 pt-7">
        <Wordmark />
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgba(255,255,255,0.48)] transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mx-5 mb-5 h-px bg-[var(--sidebar-divider)]" />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.28)]">
          Platform
        </p>
        {navigation.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                active ? "bg-[var(--sidebar-active)] text-white" : "text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-green-300" : "text-[rgba(255,255,255,0.34)]"}`} />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--sidebar-text)] transition hover:bg-white/5 hover:text-white"
          >
            <ShieldCheck className="h-4 w-4 text-[rgba(255,255,255,0.34)]" />
            Current org console
          </Link>
        </div>
      </nav>

      <div className="mx-5 mt-6 h-px bg-[var(--sidebar-divider)]" />
      <div className="px-3 pb-5 pt-4">
        <div className="px-3 py-2.5">
          <p className="text-sm font-semibold leading-tight text-white">{name}</p>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">Platform Administrator</p>
        </div>

        <div className="mt-2 rounded-2xl bg-[rgba(255,255,255,0.04)] p-2">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.36)]">
            <LogOut className="h-3.5 w-3.5" />
            Session
          </div>
          <Link
            href="/account"
            onClick={onClose}
            className="mb-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.74)] transition hover:bg-white/5 hover:text-white"
          >
            <UserCircle2 className="h-4 w-4" />
            Account
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

export function PlatformShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: {
    first_name?: string | null;
    last_name?: string | null;
  };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  );
  const name = getFullName(profile.first_name ?? "Platform", profile.last_name ?? "Admin");
  const initials = `${profile.first_name?.[0] ?? "P"}${profile.last_name?.[0] ?? "A"}`.toUpperCase();

  return (
    <div className="admin-shell-bg min-h-screen">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
          <SidebarContent name={name} pathname={pathname} onClose={() => setMobileOpen(false)} />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu overlay"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl">
              <SidebarContent mobile name={name} pathname={pathname} onClose={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[rgba(22,24,29,0.06)] bg-[rgba(251,250,247,0.88)] backdrop-blur">
            <div className="flex items-center gap-4 px-5 py-4 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)] lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <p className="admin-eyebrow">Platform Administration</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{APP_NAME}</p>
                <p className="text-xs font-medium text-[var(--muted)]">{todayLabel}</p>
              </div>

              <div className="ml-auto flex items-center gap-2.5">
                <Link
                  href="/account"
                  className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] md:flex"
                >
                  <UserCircle2 className="h-3.5 w-3.5" />
                  Account
                </Link>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold leading-tight text-[var(--foreground)]">{name}</p>
                  <p className="text-xs leading-tight text-[var(--muted)]">Platform admin</p>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-7">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
