import { DEFAULT_TIMEZONE, getFullName } from "@attendance/shared";
import { suggestOrganizationCode } from "../organizations";
import { createSupabaseServerClient } from "../supabase/server";

const PLATFORM_PAGE_SIZE = 10;

export interface PlatformMetric {
  label: string;
  value: number;
  hint: string;
}

export interface PlatformPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PlatformApplicationListItem {
  id: string;
  organizationName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  organizationType: string | null;
  estimatedMemberCount: number | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  createdAt: string;
  suggestedCode: string;
  suggestedTimezone: string;
}

export interface PlatformApplicationsResult extends PlatformPagination {
  items: PlatformApplicationListItem[];
}

export interface PlatformRecentOrganization {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  timezone: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface PlatformOrganizationListItem {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  timezone: string;
  createdAt: string;
  approvedAt: string | null;
  memberCount: number;
  adminCount: number;
  primaryAdminName: string;
  primaryAdminEmail: string;
  activityCount: number;
}

export interface PlatformOrganizationsResult extends PlatformPagination {
  items: PlatformOrganizationListItem[];
}

export interface PlatformOrganizationDetail {
  organization: {
    id: string;
    name: string;
    code: string;
    slug: string;
    status: "active" | "suspended" | "archived";
    timezone: string;
    createdAt: string;
    approvedAt: string | null;
  };
  memberCount: number;
  adminCount: number;
  activityCount: number;
  administrators: Array<{
    id: string;
    username: string;
    name: string;
    email: string;
    status: string;
    joinedAt: string;
  }>;
  members: Array<{
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
    status: string;
    joinedAt: string;
  }>;
  recentActivities: Array<{
    id: string;
    name: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  }>;
}

export interface PlatformActivityReportItem {
  id: string;
  activityId: string;
  activityName: string;
  activityStatus: string;
  activityModerationStatus: "visible" | "hidden";
  organizationName: string | null;
  organizationCode: string | null;
  creatorEmail: string | null;
  targetType: "activity" | "organizer";
  reason: string;
  details: string | null;
  status: "pending" | "dismissed" | "actioned";
  createdAt: string;
  reviewedAt: string | null;
  resolution: string | null;
}

export interface PlatformModerationQueue {
  pendingReports: PlatformActivityReportItem[];
  hiddenActivities: Array<{
    id: string;
    name: string;
    organizationName: string | null;
    organizationCode: string | null;
    moderatedAt: string | null;
    moderationReason: string | null;
  }>;
}

function normalizePage(page?: number) {
  if (!Number.isFinite(page) || !page || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function sanitizeSearchTerm(search?: string | null) {
  return (search ?? "").trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ");
}

function buildIlikePattern(search: string) {
  return `%${search}%`;
}

function buildPagination(page: number, totalCount: number): PlatformPagination {
  const totalPages = Math.max(1, Math.ceil(totalCount / PLATFORM_PAGE_SIZE));

  return {
    page,
    pageSize: PLATFORM_PAGE_SIZE,
    totalCount,
    totalPages,
  };
}

function mapApplication(
  application: {
    id: string;
    organization_name: string;
    contact_first_name: string;
    contact_last_name: string;
    contact_email: string;
    organization_type: string | null;
    estimated_member_count: number | null;
    message: string | null;
    status: "pending" | "approved" | "rejected";
    reviewed_at: string | null;
    created_at: string;
  },
): PlatformApplicationListItem {
  return {
    id: application.id,
    organizationName: application.organization_name,
    contactFirstName: application.contact_first_name,
    contactLastName: application.contact_last_name,
    contactEmail: application.contact_email,
    organizationType: application.organization_type,
    estimatedMemberCount: application.estimated_member_count,
    message: application.message,
    status: application.status,
    reviewedAt: application.reviewed_at,
    createdAt: application.created_at,
    suggestedCode: suggestOrganizationCode(application.organization_name),
    suggestedTimezone: DEFAULT_TIMEZONE,
  };
}

function mapRecentOrganization(organization: {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  timezone: string;
  created_at: string;
  approved_at: string | null;
}): PlatformRecentOrganization {
  return {
    id: organization.id,
    name: organization.name,
    code: organization.code,
    slug: organization.slug,
    status: organization.status,
    timezone: organization.timezone,
    createdAt: organization.created_at,
    approvedAt: organization.approved_at,
  };
}

export async function getPlatformDashboardData() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

  const [
    organizationsCountResult,
    activeOrganizationsCountResult,
    pendingApplicationsCountResult,
    activeMembershipsCountResult,
    activitiesCountResult,
    recentApplicationsResult,
    recentOrganizationsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("organization_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("organization_memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .gte("started_at", monthStart)
      .lt("started_at", nextMonthStart),
    supabase
      .from("organization_applications")
      .select(
        "id, organization_name, contact_first_name, contact_last_name, contact_email, organization_type, estimated_member_count, message, status, reviewed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("organizations")
      .select("id, name, code, slug, status, timezone, created_at, approved_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const metrics: PlatformMetric[] = [
    {
      label: "Organizations",
      value: organizationsCountResult.count ?? 0,
      hint: "Approved workspaces on the platform",
    },
    {
      label: "Active Organizations",
      value: activeOrganizationsCountResult.count ?? 0,
      hint: "Organizations currently allowed to operate",
    },
    {
      label: "Pending Applications",
      value: pendingApplicationsCountResult.count ?? 0,
      hint: "Requests waiting for platform review",
    },
    {
      label: "Total Platform Members",
      value: activeMembershipsCountResult.count ?? 0,
      hint: "Active organization memberships across the platform",
    },
    {
      label: "Activities This Month",
      value: activitiesCountResult.count ?? 0,
      hint: "Activities started across all active organizations this month",
    },
  ];

  return {
    metrics,
    recentApplications: (recentApplicationsResult.data ?? []).map(mapApplication),
    recentOrganizations: (recentOrganizationsResult.data ?? []).map(mapRecentOrganization),
  };
}

export async function getPlatformApplications(input?: {
  status?: "all" | "pending" | "approved" | "rejected";
  search?: string;
  page?: number;
}): Promise<PlatformApplicationsResult> {
  const supabase = await createSupabaseServerClient();
  const status = input?.status ?? "pending";
  const search = sanitizeSearchTerm(input?.search);
  const page = normalizePage(input?.page);
  const from = (page - 1) * PLATFORM_PAGE_SIZE;
  const to = from + PLATFORM_PAGE_SIZE - 1;
  const searchPattern = buildIlikePattern(search);

  let query = supabase
    .from("organization_applications")
    .select(
      "id, organization_name, contact_first_name, contact_last_name, contact_email, organization_type, estimated_member_count, message, status, reviewed_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      [
        `organization_name.ilike.${searchPattern}`,
        `contact_first_name.ilike.${searchPattern}`,
        `contact_last_name.ilike.${searchPattern}`,
        `contact_email.ilike.${searchPattern}`,
      ].join(","),
    );
  }

  const { data, count } = await query;
  const totalCount = count ?? 0;

  return {
    items: (data ?? []).map(mapApplication),
    ...buildPagination(page, totalCount),
  };
}

async function findMatchingOrganizationAdminIds(search: string) {
  const supabase = await createSupabaseServerClient();
  const searchPattern = buildIlikePattern(search);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .or(
      [
        `first_name.ilike.${searchPattern}`,
        `last_name.ilike.${searchPattern}`,
        `email.ilike.${searchPattern}`,
      ].join(","),
    )
    .limit(100);

  const userIds = (profiles ?? []).map((profile) => profile.id);
  if (!userIds.length) {
    return [];
  }

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("role", "organization_admin")
    .eq("status", "active")
    .in("user_id", userIds);

  return [...new Set((memberships ?? []).map((membership) => membership.organization_id))];
}

export async function getPlatformOrganizations(input?: {
  status?: "all" | "active" | "suspended" | "archived";
  search?: string;
  page?: number;
}): Promise<PlatformOrganizationsResult> {
  const supabase = await createSupabaseServerClient();
  const status = input?.status ?? "active";
  const search = sanitizeSearchTerm(input?.search);
  const page = normalizePage(input?.page);
  const from = (page - 1) * PLATFORM_PAGE_SIZE;
  const to = from + PLATFORM_PAGE_SIZE - 1;
  const searchPattern = buildIlikePattern(search);
  const matchingAdminOrgIds = search ? await findMatchingOrganizationAdminIds(search) : [];

  let query = supabase
    .from("organizations")
    .select("id, name, code, slug, status, timezone, created_at, approved_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    const searchClauses = [`name.ilike.${searchPattern}`, `code.ilike.${searchPattern}`];

    if (matchingAdminOrgIds.length) {
      searchClauses.push(`id.in.(${matchingAdminOrgIds.join(",")})`);
    }

    query = query.or(searchClauses.join(","));
  }

  const { data: organizations, count } = await query;
  const organizationIds = (organizations ?? []).map((organization) => organization.id);
  const totalCount = count ?? 0;

  if (!organizationIds.length) {
    return {
      items: [],
      ...buildPagination(page, totalCount),
    };
  }

  const [{ data: memberships }, { data: activities }] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select(
        "id, organization_id, username, role, status, created_at, profiles!organization_memberships_user_id_fkey(first_name, last_name, email)",
      )
      .in("organization_id", organizationIds)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase.from("activities").select("id, organization_id").in("organization_id", organizationIds),
  ]);

  const membershipMap = new Map<string, typeof memberships>();
  const activityCounts = new Map<string, number>();

  for (const membership of memberships ?? []) {
    const current = membershipMap.get(membership.organization_id) ?? [];
    current.push(membership);
    membershipMap.set(membership.organization_id, current);
  }

  for (const activity of activities ?? []) {
    activityCounts.set(activity.organization_id, (activityCounts.get(activity.organization_id) ?? 0) + 1);
  }

  return {
    items: (organizations ?? []).map((organization) => {
      const organizationMemberships = membershipMap.get(organization.id) ?? [];
      const administrators = organizationMemberships.filter((membership) => membership.role === "organization_admin");
      const primaryAdmin = administrators[0];
      const primaryAdminProfile = Array.isArray(primaryAdmin?.profiles) ? primaryAdmin.profiles[0] : primaryAdmin?.profiles;

      return {
        id: organization.id,
        name: organization.name,
        code: organization.code,
        slug: organization.slug,
        status: organization.status,
        timezone: organization.timezone,
        createdAt: organization.created_at,
        approvedAt: organization.approved_at,
        memberCount: organizationMemberships.length,
        adminCount: administrators.length,
        primaryAdminName: primaryAdminProfile
          ? getFullName(primaryAdminProfile.first_name, primaryAdminProfile.last_name)
          : "Unassigned",
        primaryAdminEmail: primaryAdminProfile?.email ?? "N/A",
        activityCount: activityCounts.get(organization.id) ?? 0,
      } satisfies PlatformOrganizationListItem;
    }),
    ...buildPagination(page, totalCount),
  };
}

export async function getPlatformOrganizationById(id: string): Promise<PlatformOrganizationDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, code, slug, status, timezone, created_at, approved_at")
    .eq("id", id)
    .maybeSingle();

  if (!organization) {
    return null;
  }

  const [{ data: memberships }, { data: recentActivities }, { count: activityCount }] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select(
        "id, username, role, status, created_at, profiles!organization_memberships_user_id_fkey(first_name, last_name, email)",
      )
      .eq("organization_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("activities")
      .select("id, name, status, started_at, ended_at")
      .eq("organization_id", id)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("organization_id", id),
  ]);

  const mappedMembers = (memberships ?? []).map((membership) => {
    const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;

    return {
      id: membership.id,
      username: membership.username,
      name: profile ? getFullName(profile.first_name, profile.last_name) : "Unknown",
      email: profile?.email ?? "N/A",
      role: membership.role,
      status: membership.status,
      joinedAt: membership.created_at,
    };
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      slug: organization.slug,
      status: organization.status,
      timezone: organization.timezone,
      createdAt: organization.created_at,
      approvedAt: organization.approved_at,
    },
    memberCount: mappedMembers.filter((member) => member.status === "active").length,
    adminCount: mappedMembers.filter((member) => member.role === "organization_admin" && member.status === "active").length,
    activityCount: activityCount ?? 0,
    administrators: mappedMembers.filter((member) => member.role === "organization_admin"),
    members: mappedMembers,
    recentActivities: (recentActivities ?? []).map((activity) => ({
      id: activity.id,
      name: activity.name,
      status: activity.status,
      startedAt: activity.started_at,
      endedAt: activity.ended_at,
    })),
  };
}

export async function getPlatformModerationQueue(): Promise<PlatformModerationQueue> {
  const supabase = await createSupabaseServerClient();

  const [{ data: reports }, { data: hiddenActivities }] = await Promise.all([
    supabase
      .from("activity_reports")
      .select(
        "id, activity_id, target_type, reason, details, status, created_at, reviewed_at, resolution, activities(id, name, status, moderation_status, organizations(name, code), profiles!activities_created_by_fkey(email))",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("activities")
      .select("id, name, moderated_at, moderation_reason, organizations(name, code)")
      .eq("moderation_status", "hidden")
      .order("moderated_at", { ascending: false })
      .limit(100),
  ]);

  return {
    pendingReports: (reports ?? []).map((report) => {
      const activity = Array.isArray(report.activities) ? report.activities[0] : report.activities;
      const organization = Array.isArray(activity?.organizations) ? activity?.organizations[0] : activity?.organizations;
      const creator = Array.isArray(activity?.profiles) ? activity?.profiles[0] : activity?.profiles;

      return {
        id: report.id,
        activityId: report.activity_id,
        activityName: activity?.name ?? "Activity unavailable",
        activityStatus: activity?.status ?? "unknown",
        activityModerationStatus: (activity?.moderation_status ?? "hidden") as "visible" | "hidden",
        organizationName: organization?.name ?? null,
        organizationCode: organization?.code ?? null,
        creatorEmail: creator?.email ?? null,
        targetType: report.target_type as "activity" | "organizer",
        reason: report.reason,
        details: report.details,
        status: report.status as "pending" | "dismissed" | "actioned",
        createdAt: report.created_at,
        reviewedAt: report.reviewed_at,
        resolution: report.resolution,
      };
    }),
    hiddenActivities: (hiddenActivities ?? []).map((activity) => {
      const organization = Array.isArray(activity.organizations) ? activity.organizations[0] : activity.organizations;
      return {
        id: activity.id,
        name: activity.name,
        organizationName: organization?.name ?? null,
        organizationCode: organization?.code ?? null,
        moderatedAt: activity.moderated_at,
        moderationReason: activity.moderation_reason,
      };
    }),
  };
}
