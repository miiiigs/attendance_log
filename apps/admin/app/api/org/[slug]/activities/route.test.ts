import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireOrgAdminApiContext = vi.fn();
const qrTokenCookieName = vi.fn(() => "qr_token_cookie");
const qrTokenCookieMaxAge = vi.fn(() => 18000);

vi.mock("../../../../../lib/org-auth", () => ({
  requireOrgAdminApiContext,
}));

vi.mock("../../../../../lib/activity-qr-token", () => ({
  qrTokenCookieName,
  qrTokenCookieMaxAge,
}));

function createUserScopedSupabase() {
  const rpc = vi.fn().mockImplementation((name: string) => {
    if (name === "create_activity") {
      return Promise.resolve({
        data: [{ id: "activity-1", organization_id: "org-1", name: "Morning Seminar", status: "active" }],
        error: null,
      });
    }
    if (name === "create_activity_qr_session") {
      return Promise.resolve({
        data: [{ id: "session-1", token: "raw-token", activity_id: "activity-1", valid_from: "2026-01-01T00:00:00Z", expires_at: "2026-01-01T05:00:00Z" }],
        error: null,
      });
    }
    throw new Error(`Unexpected rpc ${name}`);
  });

  return { rpc };
}

describe("POST /api/org/[slug]/activities", () => {
  let postRoute: typeof import("./route").POST;

  beforeAll(async () => {
    ({ POST: postRoute } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function post(body: Record<string, unknown>) {
    return postRoute(
      new Request("http://localhost/api/org/scppa/activities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: "scppa" }) },
    );
  }

  it("rejects unauthenticated callers", async () => {
    requireOrgAdminApiContext.mockResolvedValue(null);

    const response = await post({ name: "Morning Seminar" });

    expect(response.status).toBe(401);
  });

  it("creates the activity scoped to the slug organization", async () => {
    const supabase = createUserScopedSupabase();
    const adminContext = {
      organization: { id: "org-1", name: "SCPPA", code: "SCPPA", slug: "scppa", timezone: "Asia/Manila", status: "active" },
      supabase,
    };
    requireOrgAdminApiContext.mockResolvedValue(adminContext);

    const response = await post({ name: "Morning Seminar" });

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith("create_activity", {
      activity_name: "Morning Seminar",
      target_organization_id: "org-1",
      visibility: "community_only",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("create_activity_qr_session", {
      target_activity_id: "activity-1",
      ttl_seconds: 18000,
    });
  });
});
