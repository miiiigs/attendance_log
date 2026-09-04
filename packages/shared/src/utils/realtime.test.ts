import { describe, expect, it, vi } from "vitest";
import { createRealtimeInvalidationChannel } from "./realtime";

describe("realtime helpers", () => {
  it("registers every change callback and removes the channel on cleanup", async () => {
    const calls: string[] = [];
    const on = vi.fn().mockImplementation((_event, _filter, _callback) => {
      calls.push("on");
      return channel;
    });
    const subscribe = vi.fn().mockImplementation(() => {
      calls.push("subscribe");
    });
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

    expect(client.channel).toHaveBeenCalledTimes(1);
    expect(client.channel.mock.calls[0]?.[0]).toMatch(/^member-activity-home:instance-\d+$/);
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
    expect(calls).toEqual(["on", "on", "subscribe"]);

    await subscription.remove();

    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  it("uses unique physical topics for repeated logical subscriptions", async () => {
    const createdChannels: TestChannel[] = [];
    const client = createReusingClient(createdChannels);
    const onInvalidate = vi.fn();

    const first = createRealtimeInvalidationChannel({
      client,
      channelName: "mobile-home-user-1",
      changes: [{ event: "*", schema: "public", table: "activities" }],
      onInvalidate,
    });
    const second = createRealtimeInvalidationChannel({
      client,
      channelName: "mobile-home-user-1",
      changes: [{ event: "*", schema: "public", table: "activities" }],
      onInvalidate,
    });

    expect(client.channel).toHaveBeenCalledTimes(2);
    const firstTopic = client.channel.mock.calls[0]?.[0];
    const secondTopic = client.channel.mock.calls[1]?.[0];
    expect(firstTopic).toMatch(/^mobile-home-user-1:instance-\d+$/);
    expect(secondTopic).toMatch(/^mobile-home-user-1:instance-\d+$/);
    expect(secondTopic).not.toBe(firstTopic);
    expect(first.channel).not.toBe(second.channel);
    expect(createdChannels).toHaveLength(2);

    await first.remove();
    await second.remove();

    expect(client.removeChannel).toHaveBeenNthCalledWith(1, first.channel);
    expect(client.removeChannel).toHaveBeenNthCalledWith(2, second.channel);
  });

  it("does not add listeners to an already subscribed prior instance", () => {
    const createdChannels: TestChannel[] = [];
    const client = createReusingClient(createdChannels);
    const onInvalidate = vi.fn();
    const onStatus = vi.fn();

    const first = createRealtimeInvalidationChannel({
      client,
      channelName: "mobile-home-user-2",
      changes: [
        { event: "*", schema: "public", table: "activity_logs", filter: "user_id=eq.user-2" },
        { event: "*", schema: "public", table: "activities" },
      ],
      onInvalidate,
      onStatus,
    });
    const firstOnCalls = first.channel.on.mock.calls.length;

    const second = createRealtimeInvalidationChannel({
      client,
      channelName: "mobile-home-user-2",
      changes: [{ event: "*", schema: "public", table: "activities" }],
      onInvalidate,
      onStatus,
    });

    expect(first.channel.subscribed).toBe(true);
    expect(first.channel.on).toHaveBeenCalledTimes(firstOnCalls);
    expect(second.channel).not.toBe(first.channel);
    expect(second.channel.on).toHaveBeenCalledTimes(1);
    expect(second.channel.subscribe).toHaveBeenCalledWith(onStatus);
  });
});

type TestChannel = {
  topic: string;
  subscribed: boolean;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

function createTestChannel(topic: string): TestChannel {
  const channel: TestChannel = {
    topic,
    subscribed: false,
    on: vi.fn(),
    subscribe: vi.fn(),
  };

  channel.on.mockImplementation((_event, _filter, _callback) => {
    if (channel.subscribed) {
      throw new Error(`cannot add \`postgres_changes\` callbacks for ${topic} after \`subscribe()\`.`);
    }
    return channel;
  });
  channel.subscribe.mockImplementation(() => {
    channel.subscribed = true;
    return channel;
  });

  return channel;
}

function createReusingClient(createdChannels: TestChannel[]) {
  const channelsByTopic = new Map<string, TestChannel>();

  return {
    channel: vi.fn().mockImplementation((topic: string) => {
      const existing = channelsByTopic.get(topic);
      if (existing) {
        return existing;
      }

      const channel = createTestChannel(topic);
      channelsByTopic.set(topic, channel);
      createdChannels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn().mockImplementation((channel: TestChannel) => {
      channelsByTopic.delete(channel.topic);
      return Promise.resolve(undefined);
    }),
  };
}
