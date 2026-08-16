import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminApiContext = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock("../../../../../lib/auth", () => ({
  requireAdminApiContext,
}));

vi.mock("../../../../../lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

describe("POST /api/admin/attendance/time-out", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T04:00:00.000Z"));
    requireAdminApiContext.mockResolvedValue({ session: { user: { id: "admin-1" } }, profile: { id: "admin-1" } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("times out selected users for today's date", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ attendance_record_id: "record-1" }, { attendance_record_id: "record-2" }],
      error: null,
    });

    createSupabaseServerClient.mockResolvedValue({ rpc });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/attendance/time-out", {
        method: "POST",
        body: JSON.stringify({
          date: "2026-08-16",
          mode: "selected",
          userIds: ["user-1", "user-2"],
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      updatedCount: 2,
    });
    expect(rpc).toHaveBeenCalledWith("admin_force_time_out", {
      target_date: "2026-08-16",
      target_user_ids: ["user-1", "user-2"],
    });
  });

  it("reverts selected time-outs for today's date", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ attendance_record_id: "record-1" }],
      error: null,
    });

    createSupabaseServerClient.mockResolvedValue({ rpc });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/attendance/time-out", {
        method: "POST",
        body: JSON.stringify({
          action: "revert_time_out",
          date: "2026-08-16",
          mode: "selected",
          userIds: ["user-1"],
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      updatedCount: 1,
    });
    expect(rpc).toHaveBeenCalledWith("admin_revert_time_out", {
      target_date: "2026-08-16",
      target_user_ids: ["user-1"],
    });
  });

  it("rejects requests for dates other than today's Manila date", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/attendance/time-out", {
        method: "POST",
        body: JSON.stringify({
          date: "2026-08-15",
          mode: "all",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("2026-08-16");
  });

  it("requires at least one selected user when mode is selected", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/attendance/time-out", {
        method: "POST",
        body: JSON.stringify({
          date: "2026-08-16",
          mode: "selected",
          userIds: [],
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Select at least one user");
  });

  it("requires selected users when reverting time-outs", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/attendance/time-out", {
        method: "POST",
        body: JSON.stringify({
          action: "revert_time_out",
          date: "2026-08-16",
          mode: "selected",
          userIds: [],
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Select at least one user to revert");
  });
});
