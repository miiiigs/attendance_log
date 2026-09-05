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
});
