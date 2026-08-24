import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getAttendanceGreeting,
} from "@attendance/shared";
import { MobileShell, MobileStatusChip, mobileTheme } from "../../components/mobile-ui";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../lib/supabase/client";
import { getOrgTimezone } from "../../lib/config";

interface CurrentActivity {
  id: string;
  name: string;
  status: string;
  started_at: string;
}

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
  const [error, setError] = useState<string | null>(null);

  const timezone = getOrgTimezone(organization?.timezone);

  const loadCurrentActivity = useCallback(async () => {
    if (!organization) {
      setCurrentActivity(null);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from("activities")
        .select("id, name, status, started_at")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      setCurrentActivity(data ?? null);
      setError(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  }, [organization]);

  useEffect(() => {
    loadCurrentActivity().catch(() => undefined);
  }, [loadCurrentActivity, params.refresh]);

  if (!profile || !organization) {
    return null;
  }

  if (profile.status !== "active" || membership?.status !== "active") {
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

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || membership?.username || profile.email;

  return (
    <MobileShell route="/">
      <View style={styles.headerBand}>
        <View style={styles.headerAccent} />
        <View style={styles.headerBody}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLogoWrap}>
              <Text style={styles.headerLogoText}>{organization.code.slice(0, 2)}</Text>
            </View>
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
          <View style={styles.sectionBadgeWrap}>
            {currentActivity ? <MobileStatusChip label="In Progress" tone="success" /> : null}
          </View>
        </View>

        {currentActivity ? (
          <View style={styles.activityCard}>
            <Text style={styles.activityName}>{currentActivity.name}</Text>
            <Text style={styles.activityMeta}>
              Started {formatTimeInTimeZone(currentActivity.started_at, timezone)}
            </Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            <Text style={styles.activityEmpty}>No activity is currently in progress.</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionHeading}>Actions</Text>
        <View style={styles.actionGroup}>
          <Pressable
            onPress={() => router.push("/scan")}
            style={({ pressed }) => [
              styles.primaryActionButton,
              pressed ? styles.primaryActionButtonPressed : null,
            ]}
          >
            <Text style={styles.primaryActionText}>Scan Activity QR</Text>
          </Pressable>
        </View>
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
  headerLogoWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: mobileTheme.accentSoft,
  },
  headerLogoText: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTheme.accent,
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
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  activityName: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.3,
  },
  activityMeta: {
    marginTop: 6,
    fontSize: 13,
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
  actionGroup: {
    gap: 10,
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
  primaryActionText: {
    fontSize: 16,
    fontWeight: "700",
    color: mobileTheme.white,
    textAlign: "center",
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
