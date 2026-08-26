import { describe, expect, it, vi } from "vitest";
import { createRealtimeInvalidationChannel } from "./realtime";

describe("realtime helpers", () => {
  it("registers every change callback and removes the channel on cleanup", async () => {
    const on = vi.fn().mockImplementation((_event, _filter, _callback) => channel);
    const subscribe = vi.fn();
    const channel = { on, subscribe };
    const removeChannel = vi.fn().mockResolvedValue(undefined);
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel,
    };
    const onInvalidate = vi.fn();
    const onStatus = vi.fn();

    const subscription = createRealtimeInvalidationChannel({
      client,
      channelName: "member-activity-home",
      changes: [
        { event: "*", schema: "public", table: "activities", filter: "organization_id=eq.org-1" },
        { event: "*", schema: "public", table: "activity_logs", filter: "membership_id=eq.member-1" },
      ],
      onInvalidate,
      onStatus,
    });

    expect(client.channel).toHaveBeenCalledWith("member-activity-home");
    expect(on).toHaveBeenNthCalledWith(
      1,
      "postgres_changes",
      { event: "*", schema: "public", table: "activities", filter: "organization_id=eq.org-1" },
      onInvalidate,
    );
    expect(on).toHaveBeenNthCalledWith(
      2,
      "postgres_changes",
      { event: "*", schema: "public", table: "activity_logs", filter: "membership_id=eq.member-1" },
      onInvalidate,
    );
    expect(subscribe).toHaveBeenCalledWith(onStatus);

    await subscription.remove();

    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
