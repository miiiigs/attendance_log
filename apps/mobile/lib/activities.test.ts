import { beforeEach, describe, expect, it, vi } from "vitest";

function makeQuery(data: unknown) {
  const query: Record<string, unknown> = {
    select: vi.fn(function (this: unknown) {
      return query;
    }),
    eq: vi.fn(function (this: unknown) {
      return query;
    }),
    order: vi.fn(function (this: unknown) {
      return query;
    }),
    limit: vi.fn(function (this: unknown) {
      return query;
    }),
    in: vi.fn(function (this: unknown) {
      return query;
    }),
    then: (resolve: (value: unknown) => void) => Promise.resolve({ data, error: null }).then(resolve),
  };

  return query;
}

const queues: Record<string, unknown[]> = {};

vi.mock("./supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const queue = queues[table] ?? [];
      const next = queue.shift();
      if (!next) {
        throw new Error(`No mock for table ${table}`);
      }
      return next;
    },
  },
}));

describe("mobile activity loading", () => {
  beforeEach(() => {
    for (const key of Object.keys(queues)) {
      delete queues[key];
    }
  });

  it("labels a joined Community activity with the Community name, not Public", async () => {
    const { loadMyActivities, activitySourceLabel } = await import("./activities");

    queues["activity_logs"] = [
      makeQuery([{ id: "log-1", activity_id: "act-1", time_in: "2026-09-01T08:00:00Z", time_out: null }]),
    ];
    // First "activities" call is the created list (empty); second is the id lookup.
    queues["activities"] = [
      makeQuery([]),
      makeQuery([{ id: "act-1", name: "SCPPA Orientation", status: "ended", visibility: "community_only", organization_id: "org-1", created_by: "creator-1" }]),
    ];
    queues["organizations"] = [makeQuery([{ id: "org-1", name: "SCPPA" }])];

    const { joined } = await loadMyActivities("user-1");

    expect(joined).toHaveLength(1);
    expect(joined[0].organizationName).toBe("SCPPA");
    expect(joined[0].createdBy).toBe("creator-1");
    expect(activitySourceLabel(joined[0])).toBe("SCPPA");
  });

  it("labels a public activity (no organization) as Public", async () => {
    const { loadMyActivities, activitySourceLabel } = await import("./activities");

    queues["activity_logs"] = [
      makeQuery([{ id: "log-2", activity_id: "act-2", time_in: "2026-09-02T08:00:00Z", time_out: "2026-09-02T09:00:00Z" }]),
    ];
    queues["activities"] = [
      makeQuery([]),
      makeQuery([{ id: "act-2", name: "Public Seminar", status: "ended", visibility: "anyone_with_code", organization_id: null, created_by: "creator-2" }]),
    ];
    queues["organizations"] = [makeQuery([])];

    const { joined } = await loadMyActivities("user-1");

    expect(joined).toHaveLength(1);
    expect(joined[0].organizationName).toBeNull();
    expect(activitySourceLabel(joined[0])).toBe("Public");
  });

  it("uses a neutral placeholder when a moderated activity is not selectable", async () => {
    const { loadMyActivities } = await import("./activities");

    queues["activity_logs"] = [
      makeQuery([{ id: "log-3", activity_id: "act-hidden", time_in: "2026-09-03T08:00:00Z", time_out: "2026-09-03T09:00:00Z" }]),
    ];
    queues["activities"] = [
      makeQuery([]),
      makeQuery([]),
    ];
    queues["organizations"] = [makeQuery([])];

    const { joined } = await loadMyActivities("user-1");

    expect(joined).toHaveLength(1);
    expect(joined[0].name).toBe("Activity unavailable");
    expect(joined[0].createdBy).toBeNull();
  });
});
