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

let realtimeChannelInstanceId = 0;

function createRealtimeChannelInstanceName(channelName: string) {
  realtimeChannelInstanceId += 1;
  return `${channelName}:instance-${realtimeChannelInstanceId}`;
}

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
  const instanceChannelName = createRealtimeChannelInstanceName(channelName);
  const channel = changes.reduce(
    (currentChannel, change) => currentChannel.on("postgres_changes", change, onInvalidate),
    client.channel(instanceChannelName),
  );

  channel.subscribe(onStatus);

  return {
    channel,
    remove: () => client.removeChannel(channel),
  };
}
