import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const mobileTheme = {
  bg: "#F8F7F4",
  bgMuted: "#F1EEE7",
  panel: "#FFFFFF",
  panelSoft: "#FAFAF8",
  border: "#E6E4DE",
  borderSoft: "#F4F4F5",
  text: "#18181B",
  muted: "#71717A",
  mutedSoft: "#A1A1AA",
  accent: "#166534",
  accentPressed: "#14532D",
  accentSoft: "#F0FDF4",
  accentBorder: "#DCFCE7",
  warning: "#B45309",
  warningSoft: "#FFFBEB",
  warningBorder: "#FDE68A",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
  infoSoft: "#EFF6FF",
  infoBorder: "#BFDBFE",
  info: "#1D4ED8",
  dark: "#0D1117",
  darkPanel: "#111827",
  white: "#FFFFFF",
} as const;

type MainRoute = "/" | "/activities" | "/scan" | "/communities" | "/profile";
type NavRoute = MainRoute;
type ChipTone = "success" | "warning" | "danger" | "neutral" | "info";
type StatTone = "success" | "warning" | "neutral";

const navItems: Array<{ route: NavRoute; label: string }> = [
  { route: "/", label: "Home" },
  { route: "/activities", label: "Activities" },
  { route: "/scan", label: "Scan" },
  { route: "/communities", label: "Communities" },
  { route: "/profile", label: "Profile" },
];

const chipColors: Record<ChipTone, { container: ViewStyle; text: TextStyle; dot: ViewStyle }> = {
  success: {
    container: { backgroundColor: mobileTheme.accentSoft, borderColor: mobileTheme.accentBorder },
    text: { color: mobileTheme.accent },
    dot: { backgroundColor: mobileTheme.accent },
  },
  warning: {
    container: { backgroundColor: mobileTheme.warningSoft, borderColor: mobileTheme.warningBorder },
    text: { color: mobileTheme.warning },
    dot: { backgroundColor: mobileTheme.warning },
  },
  danger: {
    container: { backgroundColor: mobileTheme.dangerSoft, borderColor: mobileTheme.dangerBorder },
    text: { color: mobileTheme.danger },
    dot: { backgroundColor: mobileTheme.danger },
  },
  neutral: {
    container: { backgroundColor: "#F4F4F5", borderColor: "#E4E4E7" },
    text: { color: mobileTheme.muted },
    dot: { backgroundColor: mobileTheme.mutedSoft },
  },
  info: {
    container: { backgroundColor: mobileTheme.infoSoft, borderColor: mobileTheme.infoBorder },
    text: { color: mobileTheme.info },
    dot: { backgroundColor: mobileTheme.info },
  },
};

const statColors: Record<StatTone, { container: ViewStyle; value: TextStyle; label: TextStyle }> = {
  success: {
    container: { backgroundColor: mobileTheme.accentSoft },
    value: { color: mobileTheme.accent },
    label: { color: mobileTheme.accent, opacity: 0.72 },
  },
  warning: {
    container: { backgroundColor: mobileTheme.warningSoft },
    value: { color: mobileTheme.warning },
    label: { color: mobileTheme.warning, opacity: 0.72 },
  },
  neutral: {
    container: { backgroundColor: mobileTheme.panelSoft },
    value: { color: mobileTheme.text },
    label: { color: mobileTheme.muted },
  },
};

export function MobileShell({
  route,
  children,
  scroll = true,
  contentContainerStyle,
}: PropsWithChildren<{
  route: MainRoute;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.shellScrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.shellFixedContent, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.shellBody}>{content}</View>
        <BottomNav currentRoute={route} />
      </View>
    </SafeAreaView>
  );
}

function BottomNav({ currentRoute }: { currentRoute: MainRoute }) {
  const router = useRouter();

  return (
    <View style={styles.bottomNavWrap}>
      <View style={styles.bottomNav}>
        {navItems.map((item) => {
          const active = currentRoute === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => router.replace(item.route)}
              style={({ pressed }) => [styles.navItem, pressed && !active ? styles.navItemPressed : null]}
            >
              <View style={[styles.navIconWrap, active ? styles.navIconWrapActive : null]}>
                <NavGlyph route={item.route} active={active} />
              </View>
              <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NavGlyph({ route, active }: { route: NavRoute; active: boolean }) {
  const tone = active ? mobileTheme.accent : mobileTheme.mutedSoft;

  if (route === "/") {
    return (
      <View style={glyphStyles.home}>
        <View style={[glyphStyles.homeRoof, { borderBottomColor: tone }]} />
        <View style={[glyphStyles.homeBase, { borderColor: tone }]}>
          <View style={[glyphStyles.homeDoor, { backgroundColor: tone }]} />
        </View>
      </View>
    );
  }

  if (route === "/activities") {
    return (
      <View style={[glyphStyles.clock, { borderColor: tone }]}>
        <View style={[glyphStyles.clockHandVertical, { backgroundColor: tone }]} />
        <View style={[glyphStyles.clockHandHorizontal, { backgroundColor: tone }]} />
      </View>
    );
  }

  if (route === "/scan") {
    return (
      <View style={glyphStyles.qr}>
        <View style={[glyphStyles.qrCorner, glyphStyles.qrCornerTL, { borderColor: tone }]} />
        <View style={[glyphStyles.qrCorner, glyphStyles.qrCornerTR, { borderColor: tone }]} />
        <View style={[glyphStyles.qrCorner, glyphStyles.qrCornerBL, { borderColor: tone }]} />
        <View style={[glyphStyles.qrCorner, glyphStyles.qrCornerBR, { borderColor: tone }]} />
      </View>
    );
  }

  if (route === "/communities") {
    return (
      <View style={glyphStyles.communities}>
        <View style={[glyphStyles.communityDot, glyphStyles.communityDotLeft, { backgroundColor: tone }]} />
        <View style={[glyphStyles.communityDot, glyphStyles.communityDotRight, { backgroundColor: tone }]} />
      </View>
    );
  }

  return (
    <View style={glyphStyles.profile}>
      <View style={[glyphStyles.profileHead, { borderColor: tone }]} />
      <View style={[glyphStyles.profileBody, { borderColor: tone }]} />
    </View>
  );
}

export function MobileHeading({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.headingTrailing}>{trailing}</View> : null}
    </View>
  );
}

export function MobileCard({
  children,
  style,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function MobileSoftCard({
  children,
  style,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>) {
  return <View style={[styles.softCard, style]}>{children}</View>;
}

export function MobileLabel({
  children,
  style,
}: PropsWithChildren<{
  style?: StyleProp<TextStyle>;
}>) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function MobileStatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: ChipTone;
}) {
  const colors = chipColors[tone];

  return (
    <View style={[styles.statusChip, colors.container]}>
      <View style={[styles.statusDot, colors.dot]} />
      <Text style={[styles.statusChipText, colors.text]}>{label}</Text>
    </View>
  );
}

export function MobilePrimaryButton({
  label,
  onPress,
  disabled,
  detail,
  align = "center",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  detail?: string;
  align?: "center" | "between";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        align === "between" ? styles.primaryButtonBetween : null,
        pressed && !disabled ? styles.primaryButtonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <View>
        <Text style={styles.primaryButtonText}>{label}</Text>
        {detail ? <Text style={styles.primaryButtonDetail}>{detail}</Text> : null}
      </View>
      {align === "between" ? <Text style={styles.primaryButtonArrow}>›</Text> : null}
    </Pressable>
  );
}

export function MobileSecondaryButton({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        danger ? styles.secondaryButtonDanger : null,
        pressed && !disabled ? styles.secondaryButtonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={[styles.secondaryButtonText, danger ? styles.secondaryButtonTextDanger : null]}>{label}</Text>
    </Pressable>
  );
}

export function MobileStat({
  value,
  label,
  tone = "neutral",
}: {
  value: string | number;
  label: string;
  tone?: StatTone;
}) {
  const colors = statColors[tone];

  return (
    <View style={[styles.statCard, colors.container]}>
      <Text style={[styles.statValue, colors.value]}>{value}</Text>
      <Text style={[styles.statLabel, colors.label]}>{label}</Text>
    </View>
  );
}

export function MobileInfoRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: ReactNode;
  valueStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={[styles.infoRowValue, valueStyle]}>{value}</Text>
      ) : (
        <View>{value}</View>
      )}
    </View>
  );
}

export const mobileStyles = StyleSheet.create({
  fullScreenCenter: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: mobileTheme.bg,
  },
  errorText: {
    color: mobileTheme.danger,
    fontSize: 13,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.bg,
  },
  shell: {
    flex: 1,
    backgroundColor: mobileTheme.bg,
  },
  shellBody: {
    flex: 1,
  },
  shellScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 18,
  },
  shellFixedContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 18,
  },
  bottomNavWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: mobileTheme.bg,
  },
  bottomNav: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: mobileTheme.border,
    borderRadius: 22,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 16,
  },
  navItemPressed: {
    backgroundColor: "#F7F5EF",
  },
  navIconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  navIconWrapActive: {
    backgroundColor: mobileTheme.accentSoft,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: mobileTheme.mutedSoft,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: mobileTheme.accent,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headingBlock: {
    flex: 1,
  },
  headingTrailing: {
    alignItems: "flex-end",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: mobileTheme.mutedSoft,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.muted,
    fontWeight: "500",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    padding: 18,
  },
  softCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panelSoft,
    padding: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: mobileTheme.mutedSoft,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: mobileTheme.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonBetween: {
    justifyContent: "space-between",
  },
  primaryButtonPressed: {
    backgroundColor: mobileTheme.accentPressed,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: mobileTheme.white,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButtonDetail: {
    marginTop: 2,
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontWeight: "500",
  },
  primaryButtonArrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 26,
    lineHeight: 26,
    fontWeight: "400",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonDanger: {
    borderColor: mobileTheme.dangerBorder,
    backgroundColor: mobileTheme.dangerSoft,
  },
  secondaryButtonPressed: {
    opacity: 0.86,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  secondaryButtonTextDanger: {
    color: mobileTheme.danger,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  infoRowLabel: {
    fontSize: 14,
    color: mobileTheme.muted,
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.text,
    textAlign: "right",
  },
});

const glyphStyles = StyleSheet.create({
  home: {
    width: 16,
    height: 16,
    alignItems: "center",
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginBottom: 1,
  },
  homeBase: {
    width: 12,
    height: 9,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 1,
  },
  homeDoor: {
    width: 3,
    height: 4,
    borderRadius: 1,
  },
  clock: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  clockHandVertical: {
    position: "absolute",
    width: 1.5,
    height: 4.5,
    borderRadius: 999,
    top: 3,
  },
  clockHandHorizontal: {
    position: "absolute",
    width: 4,
    height: 1.5,
    borderRadius: 999,
    left: 7,
    top: 7,
  },
  qr: {
    width: 16,
    height: 16,
    position: "relative",
  },
  qrCorner: {
    position: "absolute",
    width: 6,
    height: 6,
    borderWidth: 1.5,
  },
  qrCornerTL: {
    left: 0,
    top: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderRadius: 2,
  },
  qrCornerTR: {
    right: 0,
    top: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderRadius: 2,
  },
  qrCornerBL: {
    left: 0,
    bottom: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderRadius: 2,
  },
  qrCornerBR: {
    right: 0,
    bottom: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRadius: 2,
  },
  communities: {
    width: 16,
    height: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  communityDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  communityDotLeft: {
    opacity: 0.55,
  },
  communityDotRight: {
    opacity: 0.95,
  },
  profile: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHead: {
    width: 6,
    height: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    marginBottom: 1.5,
  },
  profileBody: {
    width: 12,
    height: 7,
    borderWidth: 1.5,
    borderRadius: 999,
  },
});
