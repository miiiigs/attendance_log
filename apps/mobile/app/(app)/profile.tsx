import { Image, StyleSheet, Text, View } from "react-native";
import { getFullName, ORGANIZATION_NAME, ORGANIZATION_SHORT_NAME } from "@attendance/shared";
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

const scppaLogo = require("../../assets/images/scppa-logo.png");

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return null;
  }

  const initials = `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase();

  return (
    <MobileShell route="/profile">
      <MobileHeading eyebrow={ORGANIZATION_SHORT_NAME} title="Profile" subtitle="Review your account details and session status." />

      <View style={styles.identityCard}>
        <View style={styles.portalBadge}>
          <Image source={scppaLogo} style={styles.portalLogo} resizeMode="contain" />
          <Text style={styles.portalBadgeText}>{ORGANIZATION_SHORT_NAME} Portal</Text>
        </View>
        <View style={styles.identityBadge}>
          <Text style={styles.identityBadgeText}>{initials}</Text>
        </View>
        <Text style={styles.identityName}>{getFullName(profile.first_name, profile.last_name)}</Text>
        <Text style={styles.identitySub}>{profile.email}</Text>
        <View style={styles.identityStatus}>
          <MobileStatusChip
            label={profile.status === "active" ? "Active" : "Inactive"}
            tone={profile.status === "active" ? "success" : "danger"}
          />
        </View>
      </View>

      <MobileCard>
        <MobileLabel>Account information</MobileLabel>
        <View style={styles.infoStack}>
          <MobileInfoRow label="Full Name" value={getFullName(profile.first_name, profile.last_name)} />
          <MobileInfoRow label="Username" value={profile.username} />
          <MobileInfoRow label="Email" value={profile.email} valueStyle={styles.longValue} />
          <MobileInfoRow label="Role" value="Person" />
        </View>
      </MobileCard>

      <MobileSoftCard>
        <Text style={styles.noteTitle}>Session</Text>
        <Text style={styles.noteText}>
          You are signed in to the {ORGANIZATION_NAME} mobile attendance portal. Use the scan screen to log your time in and time out whenever attendance is open.
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
  portalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  portalLogo: {
    width: 20,
    height: 20,
  },
  portalBadgeText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
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
