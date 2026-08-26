import { cookies } from "next/headers";
import { Zap } from "lucide-react";
import { CurrentActivityManager } from "../../../../components/current-activity-manager";
import { StartActivityForm } from "../../../../components/start-activity-form";
import { getActivityPeople, getCurrentActivityQr, getCurrentActivitySummary } from "../../../../lib/data/org";
import { qrTokenCookieName } from "../../../../lib/activity-qr-token";
import { requireOrgAdmin } from "../../../../lib/org-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export default async function OrgCurrentActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireOrgAdmin(slug);

  const supabase = await createSupabaseServerClient();
  const { data: currentActivity } = await supabase
    .from("activities")
    .select("id, name, status, started_at")
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .maybeSingle();

  if (currentActivity) {
    const qrSession = await getCurrentActivityQr(currentActivity.id);
    const cookieStore = await cookies();
    const qrToken = cookieStore.get(qrTokenCookieName(currentActivity.id))?.value ?? null;
    const qr = qrSession && qrToken ? { ...qrSession, token: qrToken } : null;
    const people = await getActivityPeople(organization.id, currentActivity.id);
    const summary = await getCurrentActivitySummary(organization.id, currentActivity.id);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <span className="admin-chip admin-chip-success">{summary.logged} logged</span>
          <span className="admin-chip admin-chip-warning">{summary.notLogged} not yet logged</span>
          <span className="admin-chip admin-chip-soft">{summary.completed} completed</span>
        </div>

        <CurrentActivityManager
          key={`${currentActivity.id}:${qrSession?.id ?? "no-qr"}:${summary.logged}:${summary.completed}:${summary.notLogged}`}
          slug={slug}
          organizationId={organization.id}
          activityId={currentActivity.id}
          activityName={currentActivity.name}
          startedAt={currentActivity.started_at}
          qr={qr}
          hasActiveQr={Boolean(qrSession)}
          people={people}
          timezone={organization.timezone}
          organizationName={organization.name}
          organizationCode={organization.code}
        />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="admin-eyebrow">{organization.code}</p>
        <h1 className="admin-page-title mt-3">Current Activity</h1>
        <p className="admin-page-subtitle mt-2">Start a new activity to begin logging participants.</p>
      </div>

      <div className="admin-card p-6">
        <div className="admin-empty-state">
          <Zap className="h-7 w-7 text-[#d2d5dc]" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">No current activity</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              No activity is in progress. Starting one automatically generates its QR code so members can time in.
            </p>
          </div>
        </div>
      </div>

      <StartActivityForm slug={slug} />
    </section>
  );
}
