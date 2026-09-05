import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canLoadCommunityActivities,
  COMMUNITY_ACTIVITIES_ERROR,
  loadCommunityActivities,
  normalizeCommunityRouteId,
  type CommunityActivitiesClient,
} from "./community-activities";

const validCommunityId = "32f22ece-0651-4af2-a9b3-25a0bb7650da";

function makeActivitiesClient(result: { data: unknown[] | null; error: { message: string } | null }) {
  const query: Record<string, unknown> = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  const table = {
    select: vi.fn(() => query),
  };
  const client = {
    from: vi.fn(() => table),
  };

  return { client: client as unknown as CommunityActivitiesClient, from: client.from, select: table.select, query };
}

describe("Community activity loading guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid first-load route params before an activities query is built", () => {
    const malformedParams = [undefined, "", "community-id", "[object Object]", [validCommunityId]];

    for (const param of malformedParams) {
      const normalized = normalizeCommunityRouteId(param);
      expect(normalized).toBeNull();
      expect(canLoadCommunityActivities(normalized, validCommunityId)).toBe(false);
    }
  });

  it("waits for a matching active membership before loading Community activities", () => {
    const normalized = normalizeCommunityRouteId(validCommunityId);

    expect(canLoadCommunityActivities(normalized, undefined)).toBe(false);
    expect(canLoadCommunityActivities(normalized, "11111111-1111-4111-8111-111111111111")).toBe(false);
    expect(canLoadCommunityActivities(normalized, validCommunityId)).toBe(true);
  });

  it("runs the existing RLS-protected activities query for a valid Community membership", async () => {
    const { client, from, select, query } = makeActivitiesClient({
      data: [
        {
          id: "activity-1",
          name: "Orientation",
          status: "active",
          visibility: "community_only",
          started_at: "2026-09-04T00:00:00.000Z",
          ended_at: null,
          created_by: "creator-1",
        },
      ],
      error: null,
    });

    const activities = await loadCommunityActivities(client, validCommunityId);

    expect(activities).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("activities");
    expect(select).toHaveBeenCalledWith("id, name, status, visibility, started_at, ended_at, created_by");
    expect(query.eq).toHaveBeenCalledWith("organization_id", validCommunityId);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it("returns an empty list so the Community screen can render No activities yet.", async () => {
    const { client } = makeActivitiesClient({ data: [], error: null });

    await expect(loadCommunityActivities(client, validCommunityId)).resolves.toEqual([]);
  });

  it("uses a generic user-facing error instead of raw PostgreSQL text", async () => {
    const { client } = makeActivitiesClient({
      data: null,
      error: { message: 'invalid input syntax for type uuid: "community-id"' },
    });

    await expect(loadCommunityActivities(client, validCommunityId)).rejects.toMatchObject({
      message: 'invalid input syntax for type uuid: "community-id"',
    });
    expect(COMMUNITY_ACTIVITIES_ERROR).toBe("Unable to load Community activities. Please try again.");
    expect(COMMUNITY_ACTIVITIES_ERROR).not.toContain("uuid");
    expect(COMMUNITY_ACTIVITIES_ERROR).not.toContain("PostgreSQL");
  });
});
