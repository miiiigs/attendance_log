export const COMMUNITY_ACTIVITIES_ERROR = "Unable to load Community activities. Please try again.";

export interface CommunityActivity {
  id: string;
  name: string;
  status: string;
  visibility: string;
  started_at: string;
  ended_at: string | null;
}

interface CommunityActivitiesResult {
  data: CommunityActivity[] | null;
  error: { message: string } | null;
}

interface CommunityActivitiesQuery extends PromiseLike<CommunityActivitiesResult> {
  eq: (column: string, value: string) => CommunityActivitiesQuery;
  order: (column: string, options: { ascending: boolean }) => CommunityActivitiesQuery;
  limit: (count: number) => CommunityActivitiesQuery;
}

interface CommunityActivitiesTable {
  select: (columns: string) => CommunityActivitiesQuery;
}

export interface CommunityActivitiesClient {
  from: (table: "activities") => CommunityActivitiesTable;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCommunityRouteId(id: string | string[] | undefined): string | null {
  if (typeof id !== "string") {
    return null;
  }

  const trimmed = id.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

export function canLoadCommunityActivities(communityId: string | null, membershipCommunityId: string | undefined): boolean {
  return Boolean(communityId && membershipCommunityId === communityId);
}

export async function loadCommunityActivities(
  client: CommunityActivitiesClient,
  communityId: string,
): Promise<CommunityActivity[]> {
  const { data, error } = await client
    .from("activities")
    .select("id, name, status, visibility, started_at, ended_at")
    .eq("organization_id", communityId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return data ?? [];
}
