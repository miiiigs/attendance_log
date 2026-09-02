import { useEffect, useEffectEvent, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { createRealtimeInvalidationChannel, formatDateInTimeZone, formatTimeInTimeZone, getAttendanceGreeting } from "@attendance/shared";
import { MobileCard, MobileShell, MobileSoftCard, MobileStatusChip, mobileTheme } from "../../components/mobile-ui";
import { OrganizationLogo } from "../../components/branding";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../lib/supabase/client";
import { getOrgTimezone } from "../../lib/config";

interface CurrentActivity {
  id: string;
  name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

interface ActivityParticipation {
  id: string;
  activity_id: string;
  time_in: string;
  time_out: string | null;
}

interface RecentCompletion {
  activityName: string;
  timeIn: string;
  timeOut: string;
}

type ActivityState = "not_joined" | "timed_in" | "completed";

function getErrorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) {
    return reason.message;
  }
  return "Unable to load the current activity.";
}

export default function ActivityHomeScreen() {
  const { profile, organization, membership, signOut } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null);
  const [participation, setParticipation] = useState<ActivityParticipation | null>(null);
  const [recentCompletion, setRecentCompletion] = useState<RecentCompletion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const timezone = getOrgTimezone(organization?.timezone);

  const loadHomeState = useEffectEvent(async (showLoading = false) => {
    if (!organization || !membership) {
      setCurrentActivity(null);
      setParticipation(null);
      setRecentCompletion(null);
      setLoading(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }

    try {
      const { data: activeActivity, error: activityError } = await supabase
        .from("activities")
        .select("id, name, status, started_at, ended_at")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .maybeSingle();

      if (activityError) {
        throw activityError;
      }

      if (!activeActivity) {
        const { data: latestLog, error: latestLogError } = await supabase
          .from("activity_logs")
          .select("activity_id, time_in, time_out")
          .eq("membership_id", membership.id)
          .not("time_out", "is", null)
          .order("time_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestLogError) {
          throw latestLogError;
        }

        let latestActivityName = "Latest activity";
        if (latestLog?.activity_id) {
          const { data: latestActivity, error: latestActivityError } = await supabase
            .from("activities")
            .select("name")
            .eq("id", latestLog.activity_id)
            .maybeSingle();

          if (latestActivityError) {
            throw latestActivityError;
          }

          latestActivityName = latestActivity?.name ?? latestActivityName;
        }

        setCurrentActivity(null);
        setParticipation(null);
        setRecentCompletion(
          latestLog?.time_out
            ? {
                activityName: latestActivityName,
                timeIn: latestLog.time_in,
                timeOut: latestLog.time_out,
              }
            : null,
        );
        setError(null);
        return;
      }

      const { data: currentParticipation, error: participationError } = await supabase
        .from("activity_logs")
        .select("id, activity_id, time_in, time_out")
        .eq("membership_id", membership.id)
        .eq("activity_id", activeActivity.id)
        .maybeSingle();

      if (participationError) {
        throw participationError;
      }

      setCurrentActivity(activeActivity);
      setParticipation(currentParticipation ?? null);
      setRecentCompletion(null);
      setError(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    loadHomeState(true).catch(() => undefined);
  }, [loadHomeState, membership?.id, organization?.id, params.refresh]);

  useEffect(() => {
    if (!organization?.id || !membership?.id) {
      return;
    }

    const subscription = createRealtimeInvalidationChannel({
      client: supabase,
      channelName: `mobile-home-${organization.id}-${membership.id}`,
      changes: [
        { event: "*", schema: "public", table: "activities", filter: `organization_id=eq.${organization.id}` },
        { event: "*", schema: "public", table: "activity_logs", filter: `membership_id=eq.${membership.id}` },
      ],
      onInvalidate: () => {
        loadHomeState(false).catch(() => undefined);
      },
    });

    return () => {
      void subscription.remove();
    };
  }, [loadHomeState, membership?.id, organization?.id]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadHomeState(false).catch(() => undefined);
      }
    });

    return () => {
      listener.remove();
    };
  }, [loadHomeState]);

  if (!profile || !organization || !membership) {
    return null;
  }

  if (profile.status !== "active" || membership.status !== "active") {
    return (
      <MobileShell route="/" scroll={false} contentContainerStyle={styles.inactiveScreen}>
        <View style={styles.inactivePanel}>
          <Text style={styles.inactiveEyebrow}>QRLog</Text>
          <Text style={styles.inactiveTitle}>Account inactive</Text>
          <Text style={styles.inactiveSubtitle}>Activity scanning is disabled for inactive members.</Text>
          <Pressable style={styles.inactiveButton} onPress={() => signOut().catch(() => undefined)}>
            <Text style={styles.inactiveButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </MobileShell>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || membership.username || profile.email;
  const activityState: ActivityState | null = currentActivity
    ? participation?.time_out
      ? "completed"
      : participation?.time_in
        ? "timed_in"
        : "not_joined"
    : null;

  const stateChip =
    activityState === "completed" ? (
      <MobileStatusChip label="Completed" tone="success" />
    ) : activityState === "timed_in" ? (
      <MobileStatusChip label="Timed In" tone="info" />
    ) : activityState === "not_joined" ? (
      <MobileStatusChip label="Not Joined" tone="warning" />
    ) : null;

  function confirmLeaveActivity() {
    if (!currentActivity || leaving) {
      return;
    }

    Alert.alert(
      "Leave this activity?",
      "This will record your Time Out and mark the activity as completed for you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Activity",
          style: "destructive",
          onPress: () => {
            void handleLeaveActivity();
          },
        },
      ],
    );
  }

  async function handleLeaveActivity() {
    if (!currentActivity || leaving) {
      return;
    }

    setLeaving(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("leave_activity", {
        target_activity_id: currentActivity.id,
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.time_in || !result?.time_out) {
        throw new Error("Unable to leave the activity.");
      }

      setParticipation({
        id: result.activity_log_id,
        activity_id: result.activity_id,
        time_in: result.time_in,
        time_out: result.time_out,
      });
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setLeaving(false);
    }
  }

  return (
    <MobileShell route="/">
      <View style={styles.headerBand}>
        <View style={styles.headerAccent} />
        <View style={styles.headerBody}>
          <View style={styles.headerTopRow}>
            <OrganizationLogo organization={organization} size={48} />
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerSystemName}>{organization.name}</Text>
              <Text style={styles.headerOrganization}>{organization.code} · QRLog</Text>
            </View>
          </View>

          <View style={styles.headerMeta}>
            <Text style={styles.headerGreeting}>{getAttendanceGreeting()}</Text>
            <Text style={styles.headerName}>{fullName}</Text>
            <Text style={styles.headerDate}>{formatDateInTimeZone(new Date(), timezone)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summarySection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Current Activity</Text>
          <View style={styles.sectionBadgeWrap}>{stateChip}</View>
        </View>

        {loading ? (
          <MobileCard style={styles.loadingCard}>
            <ActivityIndicator color={mobileTheme.accent} />
            <Text style={styles.loadingText}>Refreshing activity state...</Text>
          </MobileCard>
        ) : currentActivity ? (
          <MobileCard style={styles.activityCard}>
            <Text style={styles.activityName}>{currentActivity.name}</Text>
            <Text style={styles.activityMeta}>Started {formatTimeInTimeZone(currentActivity.started_at, timezone)}</Text>

            {activityState === "not_joined" ? (
              <Text style={styles.activityBody}>Scan the active QR when you arrive to record your Time In.</Text>
            ) : null}

            {participation?.time_in ? (
              <View style={styles.timeGrid}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Time In</Text>
                  <Text style={styles.timeValue}>{formatTimeInTimeZone(participation.time_in, timezone)}</Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Time Out</Text>
                  <Text style={styles.timeValue}>{formatTimeInTimeZone(participation.time_out, timezone)}</Text>
                </View>
              </View>
            ) : null}
          </MobileCard>
        ) : recentCompletion ? (
          <MobileCard style={styles.activityCard}>
            <Text style={styles.activityName}>{recentCompletion.activityName}</Text>
            <Text style={styles.activityMeta}>Latest activity completed</Text>
            <View style={styles.timeGrid}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Time In</Text>
                <Text style={styles.timeValue}>{formatTimeInTimeZone(recentCompletion.timeIn, timezone)}</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Time Out</Text>
                <Text style={styles.timeValue}>{formatTimeInTimeZone(recentCompletion.timeOut, timezone)}</Text>
              </View>
            </View>
          </MobileCard>
        ) : (
          <MobileCard style={styles.activityCard}>
            <Text style={styles.activityEmpty}>No activity is currently in progress.</Text>
          </MobileCard>
        )}
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionHeading}>Actions</Text>

        {currentActivity && activityState === "not_joined" ? (
          <Pressable
            onPress={() => router.push("/scan")}
            style={({ pressed }) => [styles.primaryActionButton, pressed ? styles.primaryActionButtonPressed : null]}
          >
            <Text style={styles.primaryActionText}>Scan Activity QR</Text>
          </Pressable>
        ) : null}

        {currentActivity && activityState === "timed_in" ? (
          <Pressable
            onPress={confirmLeaveActivity}
            disabled={leaving}
            style={({ pressed }) => [
              styles.primaryActionButton,
              leaving ? styles.primaryActionButtonDisabled : null,
              pressed && !leaving ? styles.primaryActionButtonPressed : null,
            ]}
          >
            {leaving ? (
              <View style={styles.buttonInner}>
                <ActivityIndicator color={mobileTheme.white} />
                <Text style={styles.primaryActionText}>Leaving...</Text>
              </View>
            ) : (
              <Text style={styles.primaryActionText}>Leave Activity</Text>
            )}
          </Pressable>
        ) : null}

        {currentActivity && activityState === "completed" ? (
          <MobileSoftCard>
            <Text style={styles.completedTitle}>Completed</Text>
            <Text style={styles.completedText}>Your Time In and Time Out for this activity are already recorded.</Text>
          </MobileSoftCard>
        ) : null}

        {!currentActivity ? (
          <MobileSoftCard>
            <Text style={styles.completedTitle}>Waiting for the next activity</Text>
            <Text style={styles.completedText}>When an administrator starts a new activity, it will appear here automatically.</Text>
          </MobileSoftCard>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorTitle}>Unable to load activity</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
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
    gap: 18,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerSystemName: {
    fontSize: 16,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.2,
  },
  headerOrganization: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: mobileTheme.muted,
    fontWeight: "600",
  },
  headerMeta: {
    gap: 4,
  },
  headerGreeting: {
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
  headerDate: {
    fontSize: 14,
    color: mobileTheme.muted,
    fontWeight: "500",
  },
  summarySection: {
    gap: 12,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: mobileTheme.muted,
  },
  sectionBadgeWrap: {
    alignItems: "flex-end",
  },
  activityCard: {
    gap: 10,
  },
  loadingCard: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: mobileTheme.muted,
  },
  activityName: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.3,
  },
  activityMeta: {
    fontSize: 13,
    color: mobileTheme.muted,
  },
  activityBody: {
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.muted,
  },
  activityEmpty: {
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.muted,
  },
  actionsSection: {
    gap: 12,
  },
  primaryActionButton: {
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: mobileTheme.accent,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: mobileTheme.accentPressed,
  },
  primaryActionButtonPressed: {
    backgroundColor: mobileTheme.accentPressed,
  },
  primaryActionButtonDisabled: {
    opacity: 0.65,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: "700",
    color: mobileTheme.white,
    textAlign: "center",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeGrid: {
    marginTop: 6,
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
  completedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  completedText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
  errorPanel: {
    borderWidth: 1,
    borderColor: mobileTheme.dangerBorder,
    backgroundColor: mobileTheme.dangerSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.danger,
  },
  errorText: {
    color: mobileTheme.danger,
    fontSize: 13,
    lineHeight: 19,
  },
});
