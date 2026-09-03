import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDateInTimeZone } from "@attendance/shared";
import { MobileCard, MobileHeading, MobileShell, MobileStatusChip, mobileTheme } from "../../../components/mobile-ui";
import { OrganizationLogo } from "../../../components/branding";
import { useAuth } from "../../../providers/auth-provider";
import { supabase } from "../../../lib/supabase/client";
import { getOrgTimezone } from "../../../lib/config";

interface CommunityActivity {
  id: string;
  name: string;
  status: string;
  visibility: string;
  started_at: string;
  ended_at: string | null;
}

export default function CommunityPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { memberships } = useAuth();
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const membership = memberships.find((item) => item.organizationId === id);
  const isAdmin = membership?.role === "organization_admin";
  const timezone = getOrgTimezone(membership?.organization.timezone);

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("activities")
        .select("id, name, status, visibility, started_at, ended_at")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!active) {
        return;
      }

      if (queryError) {
        setError(queryError.message);
      } else {
        setActivities(data ?? []);
      }
      setLoading(false);
    }

    load().catch(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (!membership) {
    return (
      <MobileShell route="/communities">
        <MobileHeading eyebrow="QRLog" title="Community" subtitle="Community not found." />
      </MobileShell>
    );
  }

  return (
    <MobileShell route="/communities">
      <MobileHeading eyebrow={membership.organization.code} title={membership.organization.name} subtitle="Community" />

      <View style={styles.identityCard}>
        <OrganizationLogo organization={membership.organization} size={56} />
        <View style={styles.identityBody}>
          <Text style={styles.identityName}>{membership.organization.name}</Text>
          <Text style={styles.identityRole}>{isAdmin ? "Community Admin" : "Member"}</Text>
        </View>
      </View>

      {isAdmin ? (
        <Pressable
          onPress={() => router.push({ pathname: "/create-activity", params: { organizationId: id } })}
          style={({ pressed }) => [styles.createButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.createButtonText}>Create Activity</Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Recent Activities</Text>
        {loading ? (
          <MobileCard style={styles.loadingCard}>
            <ActivityIndicator color={mobileTheme.accent} />
          </MobileCard>
        ) : error ? (
          <MobileCard>
            <Text style={styles.errorText}>{error}</Text>
          </MobileCard>
        ) : activities.length ? (
          activities.map((activity) => (
            <MobileCard key={activity.id}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderBlock}>
                  <Text style={styles.activityName}>{activity.name}</Text>
                  <Text style={styles.dateMeta}>{formatDateInTimeZone(activity.started_at, timezone)}</Text>
                </View>
                <MobileStatusChip label={activity.visibility === "anyone_with_code" ? "Anyone with code" : "Members only"} tone="neutral" />
              </View>
            </MobileCard>
          ))
        ) : (
          <MobileCard>
            <Text style={styles.empty}>No activities yet.</Text>
          </MobileCard>
        )}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    borderRadius: 20,
    padding: 16,
  },
  identityBody: {
    flex: 1,
  },
  identityName: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTheme.text,
  },
  identityRole: {
    marginTop: 3,
    fontSize: 13,
    color: mobileTheme.muted,
  },
  createButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
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
    fontSize: 16,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.3,
  },
  dateMeta: {
    marginTop: 4,
    fontSize: 12,
    color: mobileTheme.mutedSoft,
  },
  empty: {
    color: mobileTheme.muted,
    textAlign: "center",
    fontSize: 14,
  },
});
