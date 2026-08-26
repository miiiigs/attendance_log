export type RealtimePostgresChange = {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  filter?: string;
};

export type RealtimeSubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CHANNEL_ERROR"
  | "CLOSED"
  | string;

type RealtimeChannelLike<TChannel> = {
  on: (
    event: "postgres_changes",
    filter: RealtimePostgresChange,
    callback: (payload: unknown) => void,
  ) => TChannel;
  subscribe: (callback?: (status: RealtimeSubscriptionStatus) => void) => unknown;
};

type RealtimeClientLike<TChannel> = {
  channel: (name: string) => TChannel;
  removeChannel: (channel: TChannel) => Promise<unknown> | unknown;
};

export function createRealtimeInvalidationChannel<TChannel extends RealtimeChannelLike<TChannel>>({
  client,
  channelName,
  changes,
  onInvalidate,
  onStatus,
}: {
  client: RealtimeClientLike<TChannel>;
  channelName: string;
  changes: readonly RealtimePostgresChange[];
  onInvalidate: (payload: unknown) => void;
  onStatus?: (status: RealtimeSubscriptionStatus) => void;
}) {
  const channel = changes.reduce(
    (currentChannel, change) => currentChannel.on("postgres_changes", change, onInvalidate),
    client.channel(channelName),
  );

  channel.subscribe(onStatus);

  return {
    channel,
    remove: () => client.removeChannel(channel),
  };
}
