import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { MobileCard, MobileHeading, MobileShell, MobileSoftCard, mobileTheme } from "../../components/mobile-ui";
import { OrganizationLogo } from "../../components/branding";
import { useAuth } from "../../providers/auth-provider";

const APPLY_URL = "https://qrlogph.vercel.app/apply";

export default function CommunitiesScreen() {
  const router = useRouter();
  const { memberships } = useAuth();

  function openApply() {
    Linking.openURL(APPLY_URL).catch(() => undefined);
  }

  return (
    <MobileShell route="/communities">
      <MobileHeading eyebrow="QRLog" title="Communities" subtitle="Communities you belong to." />

      <Pressable onPress={() => router.push("/join-community")} style={({ pressed }) => [styles.joinButton, pressed ? styles.pressed : null]}>
        <Text style={styles.joinButtonText}>Join Community</Text>
      </Pressable>

      {memberships.length ? (
        memberships.map((membership) => (
          <Pressable
            key={membership.id}
            onPress={() => router.push({ pathname: "/community/[id]", params: { id: membership.organizationId } })}
            style={({ pressed }) => [styles.communityCard, pressed ? styles.pressed : null]}
          >
            <OrganizationLogo organization={membership.organization} size={48} />
            <View style={styles.communityBody}>
              <Text style={styles.communityName}>{membership.organization.name}</Text>
              <Text style={styles.communityRole}>{membership.role === "organization_admin" ? "Community Admin" : "Member"}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      ) : (
        <MobileCard>
          <Text style={styles.empty}>You&apos;re not part of a Community yet. Join one using a Community Code.</Text>
        </MobileCard>
      )}

      <MobileSoftCard>
        <Text style={styles.applyTitle}>Want to start your own Community?</Text>
        <Text style={styles.applyText}>Apply to create a Community through the QRLog web application.</Text>
        <Pressable onPress={openApply} style={({ pressed }) => [styles.applyButton, pressed ? styles.pressed : null]}>
          <Text style={styles.applyButtonText}>Apply to create a Community</Text>
        </Pressable>
      </MobileSoftCard>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  joinButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
  },
  communityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    borderRadius: 20,
    padding: 16,
  },
  communityBody: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: "800",
    color: mobileTheme.text,
  },
  communityRole: {
    marginTop: 3,
    fontSize: 13,
    color: mobileTheme.muted,
  },
  chevron: {
    fontSize: 24,
    color: mobileTheme.mutedSoft,
  },
  empty: {
    color: mobileTheme.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },
  applyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  applyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
  applyButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: mobileTheme.accent,
    fontSize: 14,
    fontWeight: "700",
  },
});
