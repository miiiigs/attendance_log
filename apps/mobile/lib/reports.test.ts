import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("./supabase/client", () => ({
  supabase: {
    rpc,
  },
}));

describe("mobile activity reports", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("submits reports through the server-controlled RPC", async () => {
    const { submitActivityReport } = await import("./reports");
    rpc.mockResolvedValue({ data: [{ id: "report-1" }], error: null });

    await submitActivityReport({
      activityId: "activity-1",
      target: "organizer",
      reason: "harassment_or_bullying",
      details: " Please review ",
    });

    expect(rpc).toHaveBeenCalledWith("report_activity", {
      target_activity_id: "activity-1",
      report_target: "organizer",
      report_reason: "harassment_or_bullying",
      report_details: "Please review",
    });
  });

  it("surfaces RPC failure to the caller so UI can show generic copy", async () => {
    const { submitActivityReport } = await import("./reports");
    const error = new Error("duplicate key value violates unique constraint");
    rpc.mockResolvedValue({ data: null, error });

    await expect(
      submitActivityReport({
        activityId: "activity-1",
        target: "activity",
        reason: "other",
        details: "",
      }),
    ).rejects.toThrow(error);
  });

  it("keeps activity reporting independent from organizer availability", async () => {
    const { canReportActivity, canReportOrganizer } = await import("./reports");

    expect(canReportActivity("Creator removed activity")).toBe(true);
    expect(canReportOrganizer(null, "user-1")).toBe(false);
    expect(canReportOrganizer("user-1", "user-1")).toBe(false);
    expect(canReportOrganizer("creator-1", "user-1")).toBe(true);
  });

  it("calls the server-derived organizer block RPC", async () => {
    const { blockActivityOrganizer } = await import("./reports");
    rpc.mockResolvedValue({ data: [{ blocked_user_id: "creator-1" }], error: null });

    await blockActivityOrganizer("activity-1");

    expect(rpc).toHaveBeenCalledWith("block_activity_organizer", {
      target_activity_id: "activity-1",
    });
  });

  it("calls the server-controlled unblock RPC", async () => {
    const { unblockUser } = await import("./reports");
    rpc.mockResolvedValue({ data: true, error: null });

    await unblockUser("creator-1");

    expect(rpc).toHaveBeenCalledWith("unblock_user", {
      target_user_id: "creator-1",
    });
  });
});
