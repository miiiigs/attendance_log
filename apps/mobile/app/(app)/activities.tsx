import { useEffect, useEffectEvent, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { createRealtimeInvalidationChannel, formatDateInTimeZone, formatTimeInTimeZone } from "@attendance/shared";
import { MobileCard, MobileHeading, MobileShell, MobileSoftCard, MobileStatusChip, mobileTheme } from "../../components/mobile-ui";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../lib/supabase/client";
import { getOrgTimezone } from "../../lib/config";
import { loadMyActivities, activitySourceLabel, type ActivityItem } from "../../lib/activities";

type Tab = "joined" | "created";

export default function ActivitiesScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("joined");
  const [joined, setJoined] = useState<ActivityItem[]>([]);
  const [created, setCreated] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timezone = getOrgTimezone(undefined);

  const load = useEffectEvent(async () => {
    if (!profile) {
      setJoined([]);
      setCreated([]);
      return;
    }

    try {
      const result = await loadMyActivities(profile.id);
      setJoined(result.joined);
      setCreated(result.created);
      setError(null);
    } catch {
      setError("Unable to load your activities.");
    }
  });

  useEffect(() => {
    load().catch(() => undefined);
  }, [load, profile?.id]);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    const subscription = createRealtimeInvalidationChannel({
      client: supabase,
      channelName: `mobile-activities-${profile.id}`,
      changes: [
        { event: "*", schema: "public", table: "activity_logs", filter: `user_id=eq.${profile.id}` },
        { event: "*", schema: "public", table: "activities", filter: `created_by=eq.${profile.id}` },
      ],
      onInvalidate: () => {
        load().catch(() => undefined);
      },
    });

    return () => {
      void subscription.remove();
    };
  }, [load, profile?.id]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        load().catch(() => undefined);
      }
    });

    return () => {
      listener.remove();
    };
  }, [load]);

  if (!profile) {
    return null;
  }

  const items = tab === "joined" ? joined : created;

  return (
    <MobileShell route="/activities">
      <MobileHeading eyebrow="QRLog" title="Activities" subtitle={tab === "joined" ? "Activities you joined." : "Activities you created."} />

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("joined")} style={[styles.tab, tab === "joined" ? styles.tabActive : null]}>
          <Text style={[styles.tabText, tab === "joined" ? styles.tabTextActive : null]}>Joined</Text>
        </Pressable>
        <Pressable onPress={() => setTab("created")} style={[styles.tab, tab === "created" ? styles.tabActive : null]}>
          <Text style={[styles.tabText, tab === "created" ? styles.tabTextActive : null]}>Created</Text>
        </Pressable>
      </View>

      {error ? (
        <MobileSoftCard style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </MobileSoftCard>
      ) : null}

      {items.length ? (
        items.map((item) => (
          <MobileCard key={item.activityId}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderBlock}>
                <Text style={styles.activityName}>{item.name}</Text>
                <Text style={styles.dateMeta}>{formatDateInTimeZone(item.startedAt || item.timeIn || new Date().toISOString(), timezone)}</Text>
              </View>
              <MobileStatusChip label={activitySourceLabel(item)} tone="neutral" />
            </View>

            {tab === "joined" && item.timeIn ? (
              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Time In</Text>
                  <Text style={styles.timeValue}>{formatTimeInTimeZone(item.timeIn, timezone)}</Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Time Out</Text>
                  <Text style={styles.timeValue}>{formatTimeInTimeZone(item.timeOut, timezone)}</Text>
                </View>
              </View>
            ) : null}
          </MobileCard>
        ))
      ) : (
        <MobileCard>
          <Text style={styles.empty}>
            {tab === "joined" ? "You have not joined any activities yet." : "You have not created any activities yet."}
          </Text>
        </MobileCard>
      )}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: mobileTheme.accent,
    borderColor: mobileTheme.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.muted,
  },
  tabTextActive: {
    color: mobileTheme.white,
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
  timeRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 14,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: mobileTheme.mutedSoft,
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
});
