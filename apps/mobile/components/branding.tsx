import { Image, StyleSheet, View, type ImageSourcePropType, type ImageStyle, type StyleProp } from "react-native";
import { getOrganizationBranding, type OrganizationIdentity } from "@attendance/shared";
import { mobileTheme } from "./mobile-ui";

const APP_LOGO_SOURCE: ImageSourcePropType = require("../assets/images/qrlog-logo.png");

const ORGANIZATION_LOGO_SOURCES: Readonly<Record<string, ImageSourcePropType>> = {
  scppa: require("../assets/organizations/scppa-logo.png"),
};

function brandRadius(size: number) {
  return Math.round(size * 0.29);
}

export function AppLogo({
  size = 84,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={APP_LOGO_SOURCE}
      accessibilityLabel="QRLog"
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );
}

export function OrganizationLogo({
  organization,
  size = 48,
}: {
  organization: OrganizationIdentity;
  size?: number;
}) {
  const { logoKey, organizationName } = getOrganizationBranding(organization);
  const source = logoKey ? ORGANIZATION_LOGO_SOURCES[logoKey] : null;

  if (!source) {
    return <NeutralOrganizationMark size={size} />;
  }

  return (
    <View
      style={[
        styles.logoFrame,
        {
          width: size,
          height: size,
          borderRadius: brandRadius(size),
        },
      ]}
      accessibilityLabel={`${organizationName} logo`}
    >
      <Image source={source} resizeMode="contain" style={styles.logoImage} />
    </View>
  );
}

function NeutralOrganizationMark({ size }: { size: number }) {
  const glyphWidth = Math.round(size * 0.5);
  const glyphHeight = Math.round(size * 0.48);
  const roofHeight = Math.round(size * 0.15);
  const windowSize = Math.max(2, Math.round(size * 0.09));
  const windowGap = Math.max(1, Math.round(size * 0.04));
  const doorWidth = Math.max(3, Math.round(size * 0.11));
  const doorHeight = Math.max(4, Math.round(size * 0.13));

  return (
    <View
      style={[
        styles.logoFrame,
        styles.neutralFrame,
        {
          width: size,
          height: size,
          borderRadius: brandRadius(size),
        },
      ]}
      accessibilityLabel="Organization logo"
    >
      <View style={[styles.building, { width: glyphWidth, height: glyphHeight }]}>
        <View
          style={[
            styles.buildingRoof,
            {
              borderLeftWidth: glyphWidth / 2,
              borderRightWidth: glyphWidth / 2,
              borderBottomWidth: roofHeight,
            },
          ]}
        />
        <View style={styles.buildingBody}>
          <View style={[styles.buildingWindowRow, { gap: windowGap }]}>
            <View style={[styles.buildingWindow, { width: windowSize, height: windowSize }]} />
            <View style={[styles.buildingWindow, { width: windowSize, height: windowSize }]} />
          </View>
          <View style={[styles.buildingDoor, { width: doorWidth, height: doorHeight }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoFrame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  neutralFrame: {
    backgroundColor: mobileTheme.bgMuted,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  building: {
    alignItems: "center",
  },
  buildingRoof: {
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: mobileTheme.muted,
  },
  buildingBody: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Math.max(1, Math.round(3)),
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: mobileTheme.muted,
    borderRadius: 2,
  },
  buildingWindowRow: {
    flexDirection: "row",
  },
  buildingWindow: {
    borderRadius: 1,
    backgroundColor: mobileTheme.muted,
  },
  buildingDoor: {
    borderRadius: 1,
    borderWidth: 1.5,
    borderColor: mobileTheme.muted,
  },
});
