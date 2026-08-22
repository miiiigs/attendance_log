import "server-only";
import { getFullName } from "@attendance/shared";
import { createSupabaseServerClient } from "../supabase/server";

export interface OrgActivityRow {
  id: string;
  name: string;
  status: "active" | "ended";
  startedAt: string;
  endedAt: string | null;
  loggedCount: number;
}

export interface OrgActivityPage {
  activities: OrgActivityRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityPersonRow {
  userId: string;
  membershipId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipRole: string;
  membershipStatus: string;
  timeIn: string | null;
  timeOut: string | null;
}

export type ActivitySort = "newest" | "oldest" | "name_asc" | "name_desc";

function getOrgDateParts(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export async function getOrgDashboard(orgId: string, timeZone: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: currentActivity }, { data: activeMembers }, { data: recentActivities }, { count: totalActivities }, { data: mostRecentActivity }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("id, name, status, started_at, ended_at, created_at")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .maybeSingle(),
      supabase.from("organization_memberships").select("id").eq("organization_id", orgId).eq("status", "active"),
      supabase
        .from("activities")
        .select("id, name, status, started_at, ended_at, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase
        .from("activities")
        .select("id, name, status, started_at, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const { year, month } = getOrgDateParts(timeZone);
  const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();

  const { count: activitiesThisMonth } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("started_at", monthStart);

  const recentIds = (recentActivities ?? []).map((activity) => activity.id);
  let recentLoggedCounts = new Map<string, number>();
  if (recentIds.length) {
    const { data: logs } = await supabase
      .from("activity_logs")
      .select("activity_id")
      .in("activity_id", recentIds);
    const counts = new Map<string, number>();
    for (const log of logs ?? []) {
      counts.set(log.activity_id, (counts.get(log.activity_id) ?? 0) + 1);
    }
    recentLoggedCounts = counts;
  }

  const recent = (recentActivities ?? []).map((activity) => ({
    id: activity.id,
    name: activity.name,
    status: activity.status as "active" | "ended",
    startedAt: activity.started_at,
    endedAt: activity.ended_at,
    loggedCount: recentLoggedCounts.get(activity.id) ?? 0,
  }));

  const totalPeople = activeMembers?.length ?? 0;
  const mostRecent = mostRecentActivity
    ? {
        id: mostRecentActivity.id,
        name: mostRecentActivity.name,
        status: mostRecentActivity.status as "active" | "ended",
        startedAt: mostRecentActivity.started_at,
      }
    : null;

  return {
    currentActivity,
    recentActivities: recent,
    metrics: {
      totalPeople,
      totalActivities: totalActivities ?? 0,
      activitiesThisMonth: activitiesThisMonth ?? 0,
      mostRecentActivity: mostRecent,
    },
  };
}

export async function getCurrentActivitySummary(orgId: string, activityId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: memberships }, { data: logs }] = await Promise.all([
    supabase.from("organization_memberships").select("id").eq("organization_id", orgId).eq("status", "active"),
    supabase.from("activity_logs").select("membership_id, time_in, time_out").eq("activity_id", activityId),
  ]);

  const logged = logs?.length ?? 0;
  const completed = (logs ?? []).filter((log) => log.time_out).length;
  const total = memberships?.length ?? 0;

  return {
    total,
    logged,
    notLogged: Math.max(total - logged, 0),
    completed,
    open: logged - completed,
  };
}

export async function getCurrentActivityQr(activityId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("qr_sessions")
    .select("id, valid_from, expires_at, status")
    .eq("activity_id", activityId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function getActivityPeople(orgId: string, activityId: string): Promise<ActivityPersonRow[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: memberships }, { data: logs }] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select(
        "id, username, role, status, profiles!organization_memberships_user_id_fkey(id, first_name, last_name, email)",
      )
      .eq("organization_id", orgId)
      .eq("status", "active"),
    supabase.from("activity_logs").select("membership_id, time_in, time_out").eq("activity_id", activityId),
  ]);

  const logMap = new Map<string, { time_in: string; time_out: string | null }>();
  for (const log of logs ?? []) {
    logMap.set(log.membership_id, log);
  }

  return (memberships ?? []).map((membership) => {
    const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
    const log = logMap.get(membership.id);

    return {
      userId: profile?.id ?? membership.id,
      membershipId: membership.id,
      username: membership.username,
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      email: profile?.email ?? "",
      membershipRole: membership.role,
      membershipStatus: membership.status,
      timeIn: log?.time_in ?? null,
      timeOut: log?.time_out ?? null,
    };
  });
}

export async function getOrgActivityDetail(orgId: string, activityId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("id, organization_id, name, status, started_at, ended_at, created_at")
    .eq("id", activityId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!activity) {
    return null;
  }

  const summary = await getCurrentActivitySummary(orgId, activityId);
  const people = await getActivityPeople(orgId, activityId);

  return {
    activity,
    summary,
    people,
  };
}

export async function getOrgActivities(
  orgId: string,
  options: { page?: number; pageSize?: number; query?: string; sort?: ActivitySort } = {},
): Promise<OrgActivityPage> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
  const query = options.query?.trim() ?? "";
  const sort = options.sort ?? "newest";

  let builder = supabase
    .from("activities")
    .select("id, name, status, started_at, ended_at, created_at", { count: "exact" })
    .eq("organization_id", orgId);

  if (query) {
    builder = builder.ilike("name", `%${query}%`);
  }

  if (sort === "oldest") {
    builder = builder.order("started_at", { ascending: true });
  } else if (sort === "name_asc") {
    builder = builder.order("name", { ascending: true });
  } else if (sort === "name_desc") {
    builder = builder.order("name", { ascending: false });
  } else {
    builder = builder.order("started_at", { ascending: false });
  }

  const { data: activities, count } = await builder.range((page - 1) * pageSize, page * pageSize - 1);

  const ids = (activities ?? []).map((activity) => activity.id);
  let loggedCounts = new Map<string, number>();
  if (ids.length) {
    const { data: logs } = await supabase.from("activity_logs").select("activity_id").in("activity_id", ids);
    const counts = new Map<string, number>();
    for (const log of logs ?? []) {
      counts.set(log.activity_id, (counts.get(log.activity_id) ?? 0) + 1);
    }
    loggedCounts = counts;
  }

  return {
    activities: (activities ?? []).map((activity) => ({
      id: activity.id,
      name: activity.name,
      status: activity.status as "active" | "ended",
      startedAt: activity.started_at,
      endedAt: activity.ended_at,
      loggedCount: loggedCounts.get(activity.id) ?? 0,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export interface OrgPersonRow {
  userId: string;
  membershipId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipRole: string;
  membershipStatus: string;
}

export interface OrgPersonPage {
  people: OrgPersonRow[];
  total: number;
  page: number;
  pageSize: number;
  activeCount: number;
  inactiveCount: number;
}

export type OrgPeopleSort = "name_asc" | "name_desc" | "newest";

export async function getOrgPeople(
  orgId: string,
  options: { page?: number; pageSize?: number; query?: string; status?: string; sort?: OrgPeopleSort } = {},
): Promise<OrgPersonPage> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 15));
  const query = options.query?.trim() ?? "";
  const status = options.status ?? "all";
  const sort = options.sort ?? "newest";

  let builder = supabase
    .from("organization_memberships")
    .select("id, username, role, status, profiles!organization_memberships_user_id_fkey(id, first_name, last_name, email)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    builder = builder.eq("status", status);
  }

  const { data: memberships } = await builder;

  const rows: OrgPersonRow[] = (memberships ?? []).map((membership) => {
    const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
    return {
      userId: profile?.id ?? membership.id,
      membershipId: membership.id,
      username: membership.username,
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      email: profile?.email ?? "",
      membershipRole: membership.role,
      membershipStatus: membership.status,
    };
  });

  const activeCount = rows.filter((row) => row.membershipStatus === "active").length;
  const inactiveCount = rows.length - activeCount;

  const search = query.toLowerCase();
  const filtered = rows.filter((row) => {
    if (!search) {
      return true;
    }
    return [row.firstName, row.lastName, getFullName(row.firstName, row.lastName), row.username, row.email]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  if (sort === "name_asc" || sort === "name_desc") {
    filtered.sort((first, second) => {
      const comparison = getFullName(first.firstName, first.lastName).localeCompare(
        getFullName(second.firstName, second.lastName),
        undefined,
        { sensitivity: "base" },
      );
      return sort === "name_asc" ? comparison : -comparison;
    });
  } else {
    filtered.sort((first, second) => first.membershipId.localeCompare(second.membershipId));
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const people = filtered.slice(start, start + pageSize);

  return { people, total, page, pageSize, activeCount, inactiveCount };
}

export async function getOrgSettings(orgId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, code, slug, timezone, status")
    .eq("id", orgId)
    .maybeSingle();

  return data ?? null;
}

export function getPersonDisplayName(firstName: string, lastName: string, fallback: string) {
  const name = getFullName(firstName, lastName).trim();
  return name || fallback;
}
