import { supabase } from "./supabase/client";

export interface ActivityItem {
  logId: string | null;
  activityId: string;
  name: string;
  status: string;
  visibility: string;
  startedAt: string;
  endedAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  timeIn: string | null;
  timeOut: string | null;
  createdBy: string | null;
}

export function activitySourceLabel(item: Pick<ActivityItem, "organizationName" | "visibility">) {
  if (item.organizationName) {
    return item.organizationName;
  }

  return "Public";
}

export async function loadMyActivities(userId: string): Promise<{ joined: ActivityItem[]; created: ActivityItem[] }> {
  const [{ data: logs }, { data: createdActivities }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, activity_id, time_in, time_out")
      .eq("user_id", userId)
      .order("time_in", { ascending: false })
      .limit(50),
    supabase
      .from("activities")
      .select("id, name, status, visibility, started_at, ended_at, organization_id, created_by")
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const joinedActivityIds = Array.from(new Set((logs ?? []).map((log) => log.activity_id)));
  const activityIds = Array.from(
    new Set([...joinedActivityIds, ...(createdActivities ?? []).map((activity) => activity.id)]),
  );

  let activities = new Map<
    string,
    { name: string; status: string; visibility: string; organization_id: string | null; created_by: string | null }
  >();
  if (activityIds.length) {
    const { data } = await supabase
      .from("activities")
      .select("id, name, status, visibility, organization_id, created_by")
      .in("id", activityIds);
    activities = new Map((data ?? []).map((activity) => [activity.id, activity]));
  }

  // Community names must resolve from the UNION of joined and created
  // activities, otherwise a joined Community activity would fall back to
  // the "Public" label.
  const organizationIds = Array.from(
    new Set(
      [...activities.values()]
        .map((activity) => activity.organization_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let organizationNames = new Map<string, string>();
  if (organizationIds.length) {
    const { data } = await supabase.from("organizations").select("id, name").in("id", organizationIds);
    organizationNames = new Map((data ?? []).map((organization) => [organization.id, organization.name]));
  }

  const created: ActivityItem[] = (createdActivities ?? []).map((activity) => ({
    logId: null,
    activityId: activity.id,
    name: activity.name,
    status: activity.status,
    visibility: activity.visibility,
    startedAt: activity.started_at,
    endedAt: activity.ended_at,
    organizationId: activity.organization_id,
    organizationName: activity.organization_id ? organizationNames.get(activity.organization_id) ?? null : null,
    timeIn: null,
    timeOut: null,
    createdBy: activity.created_by,
  }));

  const joined: ActivityItem[] = (logs ?? [])
    .map((log) => {
      const activity = activities.get(log.activity_id);
      return {
        logId: log.id,
        activityId: log.activity_id,
        name: activity?.name ?? "Activity unavailable",
        status: activity?.status ?? "ended",
        visibility: activity?.visibility ?? "community_only",
        startedAt: "",
        endedAt: null,
        organizationId: activity?.organization_id ?? null,
        organizationName: activity?.organization_id ? organizationNames.get(activity.organization_id) ?? null : null,
        timeIn: log.time_in,
        timeOut: log.time_out,
        createdBy: activity?.created_by ?? null,
      };
    })
    .filter((item) => item.logId);

  return { joined, created };
}
