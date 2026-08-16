import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  DEFAULT_TIMEZONE,
  formatAttendanceDate,
  formatAttendanceTime,
  getAttendanceGreeting,
  isLate,
  ORGANIZATION_NAME,
  ORGANIZATION_SHORT_NAME,
} from "@attendance/shared";
import {
  MobileShell,
  MobileStatusChip,
  mobileTheme,
} from "../../components/mobile-ui";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../lib/supabase/client";

const scppaLogo = require("../../assets/images/scppa-logo.png");

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  time_in: string | null;
  time_out: string | null;
}

interface AttendanceMutationResult {
  attendance_record_id: string;
  attendance_date: string;
  scan_type: "time_in" | "time_out";
  scanned_at: string;
  time_in: string | null;
  time_out: string | null;
  message: string;
}

function getErrorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) {
    return reason.message;
  }

  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof reason.message === "string" &&
    reason.message
  ) {
    return reason.message;
  }

  return "Your time out was not recorded.";
}

function getManilaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function AttendanceHomeScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTimingOut, setIsTimingOut] = useState(false);

  const refreshRecord = useCallback(async () => {
    if (!profile) {
      return;
    }

    try {
      const today = getManilaDateString();
      const { data, error: queryError } = await supabase
        .from("attendance_records")
        .select("id, attendance_date, time_in, time_out")
        .eq("user_id", profile.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      setRecord(data ?? null);
      setError(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  }, [profile]);

  useEffect(() => {
    refreshRecord().catch(() => undefined);
  }, [refreshRecord, params.refresh]);

  function confirmTimeOut() {
    Alert.alert(
      "Confirm time out",
      "Are you sure you want to record your time out now?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Time Out",
          style: "destructive",
          onPress: () => {
            handleTimeOut().catch(() => undefined);
          },
        },
      ],
    );
  }

  async function handleTimeOut() {
    setIsTimingOut(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("self_time_out");

      if (rpcError) {
        throw rpcError;
      }

      const result = (Array.isArray(data) ? data[0] : data) as AttendanceMutationResult | null;
      if (!result) {
        throw new Error("Your time out was not recorded.");
      }

      setRecord({
        id: result.attendance_record_id,
        attendance_date: result.attendance_date,
        time_in: result.time_in,
        time_out: result.time_out,
      });
      setError(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setIsTimingOut(false);
    }
  }

  if (!profile) {
    return null;
  }

  if (profile.status !== "active") {
    return (
      <MobileShell route="/" scroll={false} contentContainerStyle={styles.inactiveScreen}>
        <View style={styles.inactivePanel}>
          <Text style={styles.inactiveEyebrow}>{getAttendanceGreeting()}</Text>
          <Text style={styles.inactiveTitle}>Account inactive</Text>
          <Text style={styles.inactiveSubtitle}>Attendance scanning is disabled for inactive users.</Text>
          <Pressable style={styles.inactiveButton} onPress={() => signOut().catch(() => undefined)}>
            <Text style={styles.inactiveButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </MobileShell>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.username;
  const attendanceTone = !record
    ? "neutral"
    : record.time_out
      ? "success"
      : isLate(record.time_in)
        ? "warning"
        : "info";
  const attendanceLabel = !record
    ? "Not Logged"
    : record.time_out
      ? "Completed"
      : isLate(record.time_in)
        ? "Late"
        : "Timed In";
  const statusTone = attendanceTone;
  const timeInValue = formatAttendanceTime(record?.time_in ?? null);
  const timeOutValue = formatAttendanceTime(record?.time_out ?? null);

  return (
    <MobileShell route="/">
      <View style={styles.headerBand}>
        <View style={styles.headerAccent} />
        <View style={styles.headerBody}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLogoWrap}>
              <Image source={scppaLogo} style={styles.headerLogo} resizeMode="contain" />
            </View>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerSystemName}>{ORGANIZATION_SHORT_NAME} Attendance Portal</Text>
              <Text style={styles.headerOrganization}>{ORGANIZATION_NAME}</Text>
            </View>
          </View>

          <View style={styles.headerMeta}>
            <Text style={styles.headerGreeting}>{getAttendanceGreeting()}</Text>
            <Text style={styles.headerName}>{fullName}</Text>
            <Text style={styles.headerDate}>{formatAttendanceDate(new Date())}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summarySection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Today&apos;s Attendance</Text>
          <View style={styles.sectionBadgeWrap}>
            <MobileStatusChip label={attendanceLabel} tone={statusTone} />
          </View>
        </View>

        <View style={styles.attendanceCard}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Time In</Text>
            <Text style={styles.dataValue}>{timeInValue}</Text>
          </View>
          <View style={[styles.dataRow, styles.dataRowLast]}>
            <Text style={styles.dataLabel}>Time Out</Text>
            <Text style={styles.dataValue}>{timeOutValue}</Text>
          </View>
        </View>
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
            <Text style={styles.primaryActionText}>Scan Attendance</Text>
          </Pressable>

          {record?.time_in && !record.time_out ? (
            <Pressable
              onPress={confirmTimeOut}
              disabled={isTimingOut}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed && !isTimingOut ? styles.secondaryActionButtonPressed : null,
                isTimingOut ? styles.actionButtonDisabled : null,
              ]}
            >
              <Text style={styles.secondaryActionText}>{isTimingOut ? "Recording Time Out..." : "Time Out Now"}</Text>
            </Pressable>
          ) : null}

          {record?.time_in && record?.time_out ? (
            <View style={styles.completionLine}>
              <Text style={styles.completionText}>Attendance for today has been completed.</Text>
            </View>
          ) : null}
        </View>
      </View>

      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorTitle}>Unable to update attendance</Text>
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
  headerBand: {
    borderWidth: 1,
    borderColor: "#CFC5B1",
    backgroundColor: "#F7F3EA",
  },
  headerAccent: {
    height: 5,
    backgroundColor: "#244B38",
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
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: "#D8D1C3",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  headerLogo: {
    width: 42,
    height: 42,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerSystemName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#20352B",
    letterSpacing: -0.2,
  },
  headerOrganization: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#5F695F",
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
    color: "#6D6A64",
  },
  headerName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#18231C",
    letterSpacing: -0.8,
  },
  headerDate: {
    fontSize: 14,
    color: "#4F5B52",
    fontWeight: "500",
  },
  inactiveButton: {
    marginTop: 20,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#244B38",
  },
  inactiveButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
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
    color: "#576259",
  },
  sectionBadgeWrap: {
    alignItems: "flex-end",
  },
  attendanceCard: {
    borderWidth: 1,
    borderColor: "#D9D4C7",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#1F2937",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  dataRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE7DB",
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  dataLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#626C64",
  },
  dataValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1A231E",
    textAlign: "right",
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
    backgroundColor: "#244B38",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1D3A2D",
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryActionButtonPressed: {
    backgroundColor: "#1C3D2E",
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  secondaryActionButton: {
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B54545",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  secondaryActionButtonPressed: {
    backgroundColor: "#FBF1F1",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A12727",
  },
  completionLine: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  completionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2B4D39",
    textAlign: "center",
  },
  errorPanel: {
    borderWidth: 1,
    borderColor: "#E3B9B9",
    backgroundColor: "#FFF7F7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A12727",
  },
  errorText: {
    color: "#A12727",
    fontSize: 13,
    lineHeight: 19,
  },
});
