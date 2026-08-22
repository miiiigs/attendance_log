import { StyleSheet, Text, View } from "react-native";
import { getFullName } from "@attendance/shared";
import {
  MobileCard,
  MobileHeading,
  MobileInfoRow,
  MobileLabel,
  MobileSecondaryButton,
  MobileShell,
  MobileSoftCard,
  MobileStatusChip,
  mobileTheme,
} from "../../components/mobile-ui";
import { useAuth } from "../../providers/auth-provider";

export default function ProfileScreen() {
  const { profile, membership, organization, signOut } = useAuth();

  if (!profile || !membership) {
    return null;
  }

  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <MobileShell route="/profile">
      <MobileHeading
        eyebrow={organization?.code ?? ""}
        title="Profile"
        subtitle="Review your account details and session status."
      />

      <View style={styles.identityCard}>
        <View style={styles.identityBadge}>
          <Text style={styles.identityBadgeText}>{initials}</Text>
        </View>
        <Text style={styles.identityName}>{getFullName(profile.firstName, profile.lastName) || membership.username}</Text>
        <Text style={styles.identitySub}>{organization?.name ?? ""}</Text>
        <View style={styles.identityStatus}>
          <MobileStatusChip
            label={membership.status === "active" ? "Active" : "Inactive"}
            tone={membership.status === "active" ? "success" : "danger"}
          />
        </View>
      </View>

      <MobileCard>
        <MobileLabel>Account information</MobileLabel>
        <View style={styles.infoStack}>
          <MobileInfoRow label="Name" value={getFullName(profile.firstName, profile.lastName) || "—"} />
          <MobileInfoRow label="Organization" value={organization?.name ?? "—"} />
          <MobileInfoRow label="Organization Code" value={organization?.code ?? "—"} />
          <MobileInfoRow label="Username" value={membership.username} />
          <MobileInfoRow label="Email" value={profile.email || "—"} valueStyle={styles.longValue} />
          <MobileInfoRow label="Membership" value={membership.role.replace("_", " ")} />
        </View>
      </MobileCard>

      <MobileSoftCard>
        <Text style={styles.noteTitle}>Session</Text>
        <Text style={styles.noteText}>
          You are signed in to {organization?.name ?? "your organization"} on Activity Log. Use the scan screen to log your time in
          and time out whenever an activity is open.
        </Text>
      </MobileSoftCard>

      <MobileSecondaryButton label="Sign Out" onPress={() => signOut().catch(() => undefined)} danger />
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    borderRadius: 24,
    backgroundColor: mobileTheme.accent,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",
  },
  identityBadge: {
    width: 68,
    height: 68,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  identityBadgeText: {
    color: mobileTheme.white,
    fontSize: 22,
    fontWeight: "800",
  },
  identityName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "800",
    color: mobileTheme.white,
    textAlign: "center",
  },
  identitySub: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    textAlign: "center",
  },
  identityStatus: {
    marginTop: 14,
  },
  infoStack: {
    marginTop: 14,
    gap: 14,
  },
  longValue: {
    maxWidth: 180,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  noteText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
});
