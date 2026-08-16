import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock3, QrCode, UserCheck, UserMinus, Users } from "lucide-react";
import { formatAttendanceDate, formatAttendanceTime, ORGANIZATION_NAME, ORGANIZATION_SHORT_NAME } from "@attendance/shared";
import { getDashboardData } from "../../lib/data/admin";

export default async function DashboardPage() {
  const { dashboardStats, lateToday, recentScans, today } = await getDashboardData();
  const completionRate =
    dashboardStats.presentToday > 0
      ? Math.round((dashboardStats.completedToday / dashboardStats.presentToday) * 100)
      : 0;
  const statCards = [
    {
      label: "Total People",
      value: dashboardStats.activePeople,
      sub: "Active accounts in the system",
      icon: Users,
      tint: "bg-[rgba(22,101,52,0.1)] text-[var(--accent)]",
    },
    {
      label: "Present Today",
      value: dashboardStats.presentToday,
      sub: "People with at least one attendance log",
      icon: UserCheck,
      tint: "bg-[rgba(21,128,61,0.1)] text-[#15803d]",
    },
    {
      label: "Late Today",
      value: lateToday,
      sub: "Logged after the grace period",
      icon: Clock3,
      tint: "bg-[rgba(180,83,9,0.1)] text-[var(--warning)]",
    },
    {
      label: "Not Yet Logged",
      value: dashboardStats.notYetLoggedToday,
      sub: "Still missing a completed record",
      icon: UserMinus,
      tint: "bg-[rgba(109,113,120,0.1)] text-[#6d7178]",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="admin-card p-6 sm:p-7">
        <div className="mb-5 flex items-center gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1 shadow-[0_10px_24px_rgba(22,24,29,0.08)]">
            <Image src="/scppa-logo.png" alt={`${ORGANIZATION_SHORT_NAME} logo`} width={44} height={44} className="h-11 w-11 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="admin-eyebrow">Administration</p>
            <p className="mt-2 text-base font-semibold leading-tight text-[var(--foreground)]">{ORGANIZATION_NAME}</p>
          </div>
        </div>
        <p className="admin-eyebrow">Dashboard</p>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="admin-page-title">Today&apos;s attendance snapshot</h1>
            <p className="admin-page-subtitle mt-2">{formatAttendanceDate(today)}</p>
          </div>
          <div className="admin-card-flat inline-flex px-4 py-3 text-sm text-[var(--muted)]">
            {lateToday} late {lateToday === 1 ? "person" : "people"} recorded so far
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="admin-kpi">
              <div className="mb-4 flex items-center justify-between">
                <span className="admin-kpi-label">{card.label}</span>
                <div className={`admin-icon-badge h-9 w-9 ${card.tint}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{card.sub}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="admin-table-shell">
          <div className="flex items-center justify-between border-b border-[#f0ede5] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent scan activity</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Newest successful scans first.</p>
            </div>
            <Link href="/attendance" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentScans.length ? (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan) => (
                    <tr key={scan.id} className="admin-table-row">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                            {scan.personName
                              .split(" ")
                              .slice(0, 2)
                              .map((part) => part[0] ?? "")
                              .join("")
                              .toUpperCase()}
                          </div>
                          <span className="font-medium text-[var(--foreground)]">{scan.personName}</span>
                        </div>
                      </td>
                      <td className="text-xs text-[var(--muted)]">{scan.email}</td>
                      <td>
                        <span className="admin-chip admin-chip-soft uppercase">{scan.scanType.replace("_", " ")}</span>
                      </td>
                      <td className="font-mono text-sm text-[var(--foreground)]">{formatAttendanceTime(scan.scannedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <CalendarCheck className="h-7 w-7 text-[#d2d5dc]" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">No scans recorded yet</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Attendance activity will appear here once people start scanning.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="admin-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Completion status</h2>
              <span className="admin-chip admin-chip-success">{completionRate}% complete</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {dashboardStats.completedToday} of {Math.max(dashboardStats.presentToday, 1)} present people have finished both time in and time out.
            </p>
          </section>

          <section className="admin-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Quick actions</h2>
              <QrCode className="h-4 w-4 text-[var(--muted)]" />
            </div>
            <div className="space-y-3">
              <Link href="/people/new" className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-[var(--foreground)] transition hover:bg-[#f3f0e9]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8e3d9] text-[var(--accent)]">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Add person</p>
                  <p className="text-xs text-[var(--muted)]">Register a new attendance account</p>
                </div>
              </Link>

              <Link href="/qr" className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-[var(--foreground)] transition hover:bg-[#f3f0e9]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8e3d9] text-[var(--accent)]">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Manage daily QR</p>
                  <p className="text-xs text-[var(--muted)]">Generate or replace today&apos;s code</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
