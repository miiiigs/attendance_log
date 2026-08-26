import { useEffect, useEffectEvent, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import { createRealtimeInvalidationChannel, formatDateInTimeZone, formatTimeInTimeZone } from "@attendance/shared";
import {
  MobileCard,
  MobileHeading,
  MobileLabel,
  MobileSecondaryButton,
  MobileShell,
  MobileSoftCard,
  MobileStatusChip,
  mobileTheme,
} from "../../components/mobile-ui";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../lib/supabase/client";
import { getOrgTimezone } from "../../lib/config";

interface ActivityLogRow {
  id: string;
  time_in: string;
  time_out: string | null;
  activity_name: string;
}

const PAGE_SIZE = 15;

export default function HistoryScreen() {
  const { profile, membership, organization } = useAuth();
  const [records, setRecords] = useState<ActivityLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const timezone = getOrgTimezone(organization?.timezone);

  const loadActivities = useEffectEvent(async (reset: boolean) => {
    if (!membership) {
      setRecords([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const from = reset ? 0 : records.length;
    const { data, error: queryError } = await supabase
      .from("activity_logs")
      .select("id, time_in, time_out, activity_id")
      .eq("membership_id", membership.id)
      .order("time_in", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const activityIds = Array.from(new Set((data ?? []).map((log) => log.activity_id)));
    let nameMap = new Map<string, string>();
    if (activityIds.length) {
      const { data: activities } = await supabase.from("activities").select("id, name").in("id", activityIds);
      nameMap = new Map((activities ?? []).map((activity) => [activity.id, activity.name]));
    }

    const rows: ActivityLogRow[] = (data ?? []).map((log) => ({
      id: log.id,
      time_in: log.time_in,
      time_out: log.time_out,
      activity_name: nameMap.get(log.activity_id) ?? "Activity",
    }));

    setRecords((current) => (reset ? rows : [...current, ...rows]));
    setHasMore((data ?? []).length === PAGE_SIZE);
    setError(null);
    setLoading(false);
  });

  useEffect(() => {
    if (!membership) {
      return;
    }

    loadActivities(true).catch(() => undefined);
  }, [loadActivities, membership?.id]);

  useEffect(() => {
    if (!membership?.id) {
      return;
    }

    const subscription = createRealtimeInvalidationChannel({
      client: supabase,
      channelName: `mobile-history-${membership.id}`,
      changes: [{ event: "*", schema: "public", table: "activity_logs", filter: `membership_id=eq.${membership.id}` }],
      onInvalidate: () => {
        loadActivities(true).catch(() => undefined);
      },
    });

    return () => {
      void subscription.remove();
    };
  }, [loadActivities, membership?.id]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadActivities(true).catch(() => undefined);
      }
    });

    return () => {
      listener.remove();
    };
  }, [loadActivities]);

  if (!profile || !membership) {
    return null;
  }

  const completedCount = records.filter((record) => record.time_out).length;

  return (
    <MobileShell route="/history">
      <MobileHeading
        eyebrow={organization?.code ?? ""}
        title="My Activities"
        subtitle="Activities you participated in, newest first."
      />

      <View style={styles.statRow}>
        <View style={[styles.statCard, styles.statCardNeutral]}>
          <Text style={[styles.statValue, styles.statValueNeutral]}>{records.length}</Text>
          <Text style={styles.statLabel}>Activities</Text>
        </View>
        <View style={[styles.statCard, styles.statCardSuccess]}>
          <Text style={[styles.statValue, styles.statValueSuccess]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {error ? (
        <MobileSoftCard style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </MobileSoftCard>
      ) : null}

      {records.length ? (
        records.map((record) => {
          const completed = Boolean(record.time_out);

          return (
            <MobileCard key={record.id}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderBlock}>
                  <Text style={styles.activityName}>{record.activity_name}</Text>
                  <Text style={styles.dateMeta}>{formatDateInTimeZone(record.time_in, timezone)}</Text>
                </View>
                <MobileStatusChip label={completed ? "Completed" : "Timed In"} tone={completed ? "success" : "info"} />
              </View>

              <View style={styles.historyTimeRow}>
                <View style={styles.historyTimeBlock}>
                  <MobileLabel>Time In</MobileLabel>
                  <Text style={styles.timeValue}>{formatTimeInTimeZone(record.time_in, timezone)}</Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.historyTimeBlock}>
                  <MobileLabel>Time Out</MobileLabel>
                  <Text style={styles.timeValue}>{formatTimeInTimeZone(record.time_out, timezone)}</Text>
                </View>
              </View>
            </MobileCard>
          );
        })
      ) : (
        <MobileCard>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={mobileTheme.accent} />
              <Text style={styles.loadingText}>Refreshing activity history...</Text>
            </View>
          ) : (
            <Text style={styles.empty}>You have not joined any activities yet.</Text>
          )}
        </MobileCard>
      )}

      {hasMore ? (
        <MobileSecondaryButton
          label={loading ? "Loading..." : "Load More"}
          disabled={loading}
          onPress={() => loadActivities(false).catch(() => undefined)}
        />
      ) : null}

      {records.length > 0 && !hasMore ? (
        <Text style={styles.endText}>You are all caught up.</Text>
      ) : null}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: "row",
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardNeutral: {
    backgroundColor: mobileTheme.panelSoft,
  },
  statCardSuccess: {
    backgroundColor: mobileTheme.accentSoft,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statValueNeutral: {
    color: mobileTheme.text,
  },
  statValueSuccess: {
    color: mobileTheme.accent,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: mobileTheme.muted,
  },
  errorCard: {
    borderColor: mobileTheme.dangerBorder,
    backgroundColor: mobileTheme.dangerSoft,
  },
  errorText: {
    color: mobileTheme.danger,
    fontSize: 13,
    lineHeight: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderBlock: {
    flex: 1,
  },
  activityName: {
    fontSize: 17,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.3,
  },
  dateMeta: {
    marginTop: 4,
    fontSize: 12,
    color: mobileTheme.mutedSoft,
  },
  historyTimeRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 14,
  },
  historyTimeBlock: {
    flex: 1,
  },
  timeValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  timeDivider: {
    width: 1,
    backgroundColor: mobileTheme.borderSoft,
  },
  empty: {
    color: mobileTheme.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: mobileTheme.muted,
    textAlign: "center",
    fontSize: 13,
  },
  endText: {
    color: mobileTheme.mutedSoft,
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
});
