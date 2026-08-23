import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Users } from "lucide-react";
import { formatDateTimeInTimeZone } from "@attendance/shared";
import { ActivityPeopleTable } from "../../../../../components/activity-people-table";
import { getOrgActivityDetail } from "../../../../../lib/data/org";
import { requireOrgAdmin } from "../../../../../lib/org-auth";

export default async function OrgActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { organization } = await requireOrgAdmin(slug);

  const detail = await getOrgActivityDetail(organization.id, id);
  if (!detail) {
    notFound();
  }

  const { activity, summary, people } = detail;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/org/${slug}/activities`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to activities
        </Link>
      </div>

      <section className="admin-card p-6 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="admin-eyebrow">Activity</p>
            <h1 className="admin-page-title mt-3">{activity.name}</h1>
            <p className="admin-page-subtitle mt-2">
              Started {formatDateTimeInTimeZone(activity.started_at, organization.timezone)}
              {activity.ended_at ? ` · Ended ${formatDateTimeInTimeZone(activity.ended_at, organization.timezone)}` : ""}
            </p>
          </div>
          <span className={`admin-chip capitalize ${activity.status === "active" ? "admin-chip-success" : "admin-chip-soft"}`}>
            {activity.status}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="admin-kpi">
          <p className="admin-kpi-label">Total People</p>
          <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{summary.total}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">active members</p>
        </article>
        <article className="admin-kpi">
          <p className="admin-kpi-label">Logged</p>
          <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{summary.logged}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">members with time in</p>
        </article>
        <article className="admin-kpi">
          <p className="admin-kpi-label">Not Logged</p>
          <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{summary.notLogged}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">still missing</p>
        </article>
        <article className="admin-kpi">
          <p className="admin-kpi-label">Completed</p>
          <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{summary.completed}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">time in + out</p>
        </article>
      </section>

      <section className="admin-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <Users className="h-4 w-4 text-[var(--muted)]" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">People activity</h2>
        </div>
        <ActivityPeopleTable people={people} timezone={organization.timezone} />
      </section>

      <section className="admin-card-flat flex items-center gap-2.5 px-4 py-3.5">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
        <p className="text-xs leading-6 text-[var(--muted)]">
          Incomplete time-in rows remain incomplete. Ending an activity never fabricates time-outs.
        </p>
      </section>

      <Link href={`/org/${slug}/current-activity`} className="admin-button-secondary inline-flex w-auto">
        <CalendarClock className="h-4 w-4" />
        Go to current activity
      </Link>
    </div>
  );
}
