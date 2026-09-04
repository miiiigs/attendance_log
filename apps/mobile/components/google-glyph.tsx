import { StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "./mobile-ui";

export function GoogleGlyph() {
  return (
    <View style={styles.googleGlyph} accessibilityLabel="Google">
      <Text style={styles.googleGlyphText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  googleGlyph: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
  },
  googleGlyphText: {
    color: mobileTheme.white,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
});
