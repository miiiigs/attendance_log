import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requirePlatformAdminApiContext = vi.fn();
const rpc = vi.fn();

vi.mock("../../../../../../lib/auth", () => ({
  requirePlatformAdminApiContext,
}));

vi.mock("../../../../../../lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => ({ rpc })),
}));

describe("POST /api/platform/activity-reports/[id]/hide", () => {
  let postRoute: typeof import("./route").POST;

  beforeAll(async () => {
    ({ POST: postRoute } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-platform callers", async () => {
    requirePlatformAdminApiContext.mockResolvedValue(null);

    const response = await postRoute(new Request("http://localhost/api/platform/activity-reports/report-1/hide"), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the platform hide RPC for authorized moderators", async () => {
    requirePlatformAdminApiContext.mockResolvedValue({ user: { id: "platform-admin" } });
    rpc.mockResolvedValue({ data: [{ id: "report-1" }], error: null });

    const response = await postRoute(new Request("http://localhost/api/platform/activity-reports/report-1/hide"), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("platform_hide_activity_report", {
      target_report_id: "report-1",
      moderator_note: null,
    });
  });
});
