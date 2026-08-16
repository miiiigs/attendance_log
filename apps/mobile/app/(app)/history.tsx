import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { formatAttendanceDate, formatAttendanceTime, isLate, ORGANIZATION_SHORT_NAME } from "@attendance/shared";
import {
  MobileCard,
  MobileHeading,
  MobileLabel,
  MobileShell,
  MobileSoftCard,
  MobileStat,
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

export default function HistoryScreen() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      if (!profile) {
        return;
      }

      const { data, error: queryError } = await supabase
        .from("attendance_records")
        .select("id, attendance_date, time_in, time_out")
        .eq("user_id", profile.id)
        .order("attendance_date", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        return;
      }

      setRecords(data ?? []);
    }

    loadHistory().catch(() => undefined);
  }, [profile]);

  const completedCount = records.filter((record) => record.time_in && record.time_out).length;
  const openCount = records.filter((record) => record.time_in && !record.time_out).length;
  const lateCount = records.filter((record) => isLate(record.time_in)).length;

  return (
    <MobileShell route="/history">
      <MobileHeading
        eyebrow={ORGANIZATION_SHORT_NAME}
        title="Attendance History"
        subtitle="Review your recent attendance records and scan results."
      />

      <View style={styles.brandRow}>
        <Image source={scppaLogo} style={styles.brandLogo} resizeMode="contain" />
        <Text style={styles.brandText}>{ORGANIZATION_SHORT_NAME} Portal</Text>
      </View>

      <View style={styles.statRow}>
        <MobileStat value={completedCount} label="Completed" tone="success" />
        <MobileStat value={openCount} label="Open" tone="neutral" />
        <MobileStat value={lateCount} label="Late" tone="warning" />
      </View>

      {error ? (
        <MobileSoftCard style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </MobileSoftCard>
      ) : null}

      {records.length ? (
        records.map((record) => {
          const tone = record.time_out ? "success" : isLate(record.time_in) ? "warning" : "info";
          const label = record.time_out ? "Completed" : isLate(record.time_in) ? "Late" : "Timed In";

          return (
            <MobileCard key={record.id}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.date}>{formatAttendanceDate(record.attendance_date)}</Text>
                  <Text style={styles.dateMeta}>Attendance record</Text>
                </View>
                <MobileStatusChip label={label} tone={tone} />
              </View>

              <View style={styles.historyTimeRow}>
                <View style={styles.historyTimeBlock}>
                  <MobileLabel>Time In</MobileLabel>
                  <Text style={styles.timeValue}>{formatAttendanceTime(record.time_in)}</Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.historyTimeBlock}>
                  <MobileLabel>Time Out</MobileLabel>
                  <Text style={styles.timeValue}>{formatAttendanceTime(record.time_out)}</Text>
                </View>
              </View>
            </MobileCard>
          );
        })
      ) : (
        <MobileCard>
          <Text style={styles.empty}>No attendance records yet.</Text>
        </MobileCard>
      )}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  brandText: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.muted,
  },
  statRow: {
    flexDirection: "row",
    gap: 16,
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
  date: {
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
});
