import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { createRealtimeInvalidationChannel, getAttendanceGreeting, getDisplayName } from "@attendance/shared";
import { MobileCard, MobileShell, MobileStatusChip, MobileSoftCard, mobileTheme } from "../../components/mobile-ui";
import { OrganizationLogo } from "../../components/branding";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../lib/supabase/client";
import { loadMyActivities, activitySourceLabel, type ActivityItem } from "../../lib/activities";

export default function HomeScreen() {
  const { profile, memberships, signOut } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);
  const lastRefreshRef = useRef<string | undefined>(undefined);

  // Stable loader. Only `profile?.id` affects identity, so effects never loop.
  // `initial` distinguishes the one-time blocking load from silent refreshes:
  // background refreshes (realtime / AppState / nav refresh) never toggle the
  // spinner and never clear already-rendered cards.
  const loadRecent = useCallback(
    async (initial: boolean) => {
      const userId = profile?.id;
      if (!userId) {
        setRecentActivities([]);
        setError(null);
        return;
      }

      const seq = ++requestSeq.current;
      if (initial) {
        setLoading(true);
        setError(null);
      }

      try {
        const { joined } = await loadMyActivities(userId);
        if (seq !== requestSeq.current) {
          return;
        }
        setRecentActivities(joined.slice(0, 5));
        setError(null);
      } catch {
        if (seq !== requestSeq.current) {
          return;
        }
        if (initial) {
          setError("Unable to load your activities.");
        }
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
        }
      }
    },
    [profile?.id],
  );

  useEffect(() => {
    loadRecent(true).catch(() => undefined);
  }, [loadRecent]);

  useEffect(() => {
    const refresh = typeof params.refresh === "string" ? params.refresh : undefined;
    if (refresh && refresh !== lastRefreshRef.current) {
      lastRefreshRef.current = refresh;
      loadRecent(false).catch(() => undefined);
    }
  }, [params.refresh, loadRecent]);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    const subscription = createRealtimeInvalidationChannel({
      client: supabase,
      channelName: `mobile-home-${profile.id}`,
      changes: [
        { event: "*", schema: "public", table: "activity_logs", filter: `user_id=eq.${profile.id}` },
        { event: "*", schema: "public", table: "activities" },
      ],
      onInvalidate: () => {
        loadRecent(false).catch(() => undefined);
      },
    });

    return () => {
      void subscription.remove();
    };
  }, [loadRecent, profile?.id]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadRecent(false).catch(() => undefined);
      }
    });

    return () => {
      listener.remove();
    };
  }, [loadRecent]);

  if (!profile) {
    return (
      <MobileShell route="/" scroll={false} contentContainerStyle={styles.centerScreen}>
        <ActivityIndicator color={mobileTheme.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </MobileShell>
    );
  }

  if (profile.status !== "active") {
    return (
      <MobileShell route="/" scroll={false} contentContainerStyle={styles.inactiveScreen}>
        <View style={styles.inactivePanel}>
          <Text style={styles.inactiveEyebrow}>QRLog</Text>
          <Text style={styles.inactiveTitle}>Account inactive</Text>
          <Text style={styles.inactiveSubtitle}>Activity scanning is disabled for inactive accounts.</Text>
          <Pressable style={styles.inactiveButton} onPress={() => signOut().catch(() => undefined)}>
            <Text style={styles.inactiveButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </MobileShell>
    );
  }

  const displayName = getDisplayName(profile.firstName, profile.lastName, profile.displayName) || "Guest";

  return (
    <MobileShell route="/">
      <View style={styles.headerBand}>
        <View style={styles.headerAccent} />
        <View style={styles.headerBody}>
          <Text style={styles.headerSystemName}>QRLog</Text>
          <Text style={styles.headerGreeting}>{getAttendanceGreeting()}</Text>
          <Text style={styles.headerName}>{displayName}</Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <View style={styles.actionRow}>
          <Pressable onPress={() => router.push("/scan")} style={({ pressed }) => [styles.actionButton, pressed ? styles.actionPressed : null]}>
            <Text style={styles.actionButtonText}>Join Activity</Text>
            <Text style={styles.actionButtonDetail}>Scan a QR</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/create-activity")}
            style={({ pressed }) => [styles.actionButton, styles.actionButtonSecondary, pressed ? styles.actionPressed : null]}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextDark]}>Create Activity</Text>
            <Text style={styles.actionButtonDetail}>Host an activity</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Your Communities</Text>
        {memberships.length ? (
          memberships.slice(0, 3).map((membership) => (
            <Pressable
              key={membership.id}
              onPress={() => router.push({ pathname: "/community/[id]", params: { id: membership.organizationId } })}
              style={({ pressed }) => [styles.communityCard, pressed ? styles.actionPressed : null]}
            >
              <OrganizationLogo organization={membership.organization} size={40} />
              <View style={styles.communityCardBody}>
                <Text style={styles.communityName}>{membership.organization.name}</Text>
                <Text style={styles.communityRole}>{membership.role === "organization_admin" ? "Community Admin" : "Member"}</Text>
              </View>
              <Text style={styles.communityChevron}>›</Text>
            </Pressable>
          ))
        ) : (
          <MobileSoftCard>
            <Text style={styles.communityEmptyTitle}>Your Communities</Text>
            <Text style={styles.communityEmptyText}>You&apos;re not part of a Community yet. Join one using a Community Code.</Text>
            <Pressable
              onPress={() => router.push("/join-community")}
              style={({ pressed }) => [styles.joinButton, pressed ? styles.actionPressed : null]}
            >
              <Text style={styles.joinButtonText}>Join Community</Text>
            </Pressable>
          </MobileSoftCard>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Recent Activities</Text>
        {loading ? (
          <MobileCard style={styles.loadingCard}>
            <ActivityIndicator color={mobileTheme.accent} />
          </MobileCard>
        ) : error ? (
          <MobileSoftCard>
            <Text style={styles.errorText}>{error}</Text>
          </MobileSoftCard>
        ) : recentActivities.length ? (
          recentActivities.map((item) => (
            <MobileCard key={item.logId ?? item.activityId}>
              <View style={styles.activityCardHeader}>
                <Text style={styles.activityName}>{item.name}</Text>
                <MobileStatusChip label={activitySourceLabel(item)} tone="neutral" />
              </View>
              {item.timeOut ? (
                <Text style={styles.activityMeta}>Completed</Text>
              ) : (
                <Text style={styles.activityMeta}>In progress</Text>
              )}
            </MobileCard>
          ))
        ) : (
          <MobileCard>
            <Text style={styles.activityEmpty}>You haven&apos;t joined any activities yet.</Text>
          </MobileCard>
        )}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: mobileTheme.muted,
    fontSize: 13,
  },
  inactiveScreen: {
    justifyContent: "center",
  },
  inactivePanel: {
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  inactiveEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: mobileTheme.muted,
  },
  inactiveTitle: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.7,
  },
  inactiveSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.muted,
  },
  inactiveButton: {
    marginTop: 20,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.accent,
    borderRadius: 16,
  },
  inactiveButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  headerBand: {
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    borderRadius: 24,
    overflow: "hidden",
  },
  headerAccent: {
    height: 5,
    backgroundColor: mobileTheme.accent,
  },
  headerBody: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 4,
  },
  headerSystemName: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: mobileTheme.accent,
  },
  headerGreeting: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: mobileTheme.muted,
  },
  headerName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.8,
  },
  actionsSection: {
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: mobileTheme.accent,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 2,
  },
  actionButtonSecondary: {
    backgroundColor: mobileTheme.panel,
    borderWidth: 1,
    borderColor: mobileTheme.border,
  },
  actionPressed: {
    opacity: 0.86,
  },
  actionButtonText: {
    color: mobileTheme.white,
    fontSize: 15,
    fontWeight: "700",
  },
  actionButtonTextDark: {
    color: mobileTheme.text,
  },
  actionButtonDetail: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: mobileTheme.muted,
  },
  communityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    borderRadius: 18,
    padding: 14,
  },
  communityCardBody: {
    flex: 1,
  },
  communityName: {
    fontSize: 15,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  communityRole: {
    marginTop: 2,
    fontSize: 12,
    color: mobileTheme.muted,
  },
  communityChevron: {
    fontSize: 22,
    color: mobileTheme.mutedSoft,
  },
  communityEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  communityEmptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
  joinButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  errorText: {
    color: mobileTheme.danger,
    fontSize: 13,
    lineHeight: 20,
  },
  activityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  activityName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.3,
  },
  activityMeta: {
    marginTop: 8,
    fontSize: 12,
    color: mobileTheme.muted,
  },
  activityEmpty: {
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.muted,
  },
});
