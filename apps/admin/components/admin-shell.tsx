"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Settings,
  TableProperties,
  Users,
  X,
} from "lucide-react";
import {
  ADMIN_PORTAL_NAME,
  getFullName,
  ORGANIZATION_NAME,
  ORGANIZATION_SHORT_NAME,
} from "@attendance/shared";
import { LogoutButton } from "./logout-button";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: TableProperties },
  { href: "/people", label: "People", icon: Users },
  { href: "/qr", label: "Attendance QR", icon: QrCode },
  { href: "/settings", label: "Settings", icon: Settings },
];

const CURRENT_DATE_LABEL = "Sunday, August 16, 2026";

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
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.08)] p-1.5">
            <Image
              src="/scppa-logo.png"
              alt={`${ORGANIZATION_SHORT_NAME} logo`}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
          <div>
            <p className="max-w-[150px] text-[12px] font-semibold leading-[1.2] tracking-tight text-white">
              {ORGANIZATION_NAME}
            </p>
            <p className="mt-1 text-[11px] leading-none text-[rgba(255,255,255,0.42)]">{ADMIN_PORTAL_NAME}</p>
          </div>
        </div>
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
          Navigation
        </p>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
      </nav>

      <div className="mx-5 mt-6 h-px bg-[var(--sidebar-divider)]" />
        <div className="px-3 pb-5 pt-4">
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold leading-tight text-white">{name}</p>
            <p className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">Administrator</p>
        </div>

        <div className="mt-2 rounded-2xl bg-[rgba(255,255,255,0.04)] p-2">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.36)]">
            <LogOut className="h-3.5 w-3.5" />
            Session
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
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
  const todayLabel = useMemo(() => CURRENT_DATE_LABEL, []);
  const name = getFullName(profile.first_name ?? "Admin", profile.last_name ?? "User");
  const initials = `${profile.first_name?.[0] ?? "A"}${profile.last_name?.[0] ?? "U"}`.toUpperCase();
  const currentItem =
    navigation.find((item) => item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)) ??
    navigation[0]!;

  return (
    <div className="admin-shell-bg min-h-screen">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
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

              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] p-1 shadow-[0_6px_16px_rgba(22,24,29,0.08)]">
                  <Image
                    src="/scppa-logo.png"
                    alt={`${ORGANIZATION_SHORT_NAME} logo`}
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{ORGANIZATION_SHORT_NAME} Portal</p>
                  <p className="truncate text-xs text-[var(--muted)]">{currentItem.label}</p>
                </div>
              </div>

              <div className="hidden min-w-0 items-center gap-3 lg:flex">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] p-1.5 shadow-[0_10px_24px_rgba(22,24,29,0.08)]">
                  <Image
                    src="/scppa-logo.png"
                    alt={`${ORGANIZATION_SHORT_NAME} logo`}
                    width={30}
                    height={30}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{ORGANIZATION_NAME}</p>
                  <p className="text-xs font-medium text-[var(--muted)]">{todayLabel}</p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <div className="hidden items-center gap-2.5 lg:flex">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-[var(--foreground)]">{name}</p>
                    <p className="text-xs leading-tight text-[var(--muted)]">Administrator</p>
                  </div>
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
