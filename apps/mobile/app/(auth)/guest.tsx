import { useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";
import { createGuestSession } from "../../lib/auth/guest";
import { useAuth } from "../../providers/auth-provider";

/**
 * Guest entry. The anonymous Auth identity and guest profile are created ONLY
 * when the user presses "Continue" — mounting this screen never calls
 * `signInAnonymously()`.
 */
export default function GuestScreen() {
  const router = useRouter();
  const { refreshSessionContext } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinueAsGuest() {
    setLoading(true);
    setError(null);

    const result = await createGuestSession(supabase, displayName);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await refreshSessionContext();
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.topBar} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brandEyebrow}>No account required</Text>
            <Text style={styles.brandTitle}>Continue as Guest</Text>
            <Text style={styles.brandSubtitle}>No account required. You can join eligible activities right away.</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorCardTitle}>Unable to continue</Text>
                <Text style={styles.errorCardText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder="e.g. Alex"
                placeholderTextColor={mobileTheme.mutedSoft}
                style={styles.input}
              />
            </View>

            <Text style={styles.guestNote}>
              Your activity history stays on this device. You can create an account later to keep it across devices.
            </Text>

            <Pressable
              onPress={() => handleContinueAsGuest().catch(() => undefined)}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              {loading ? (
                <View style={styles.buttonInner}>
                  <ActivityIndicator color={mobileTheme.white} />
                  <Text style={styles.buttonText}>Continuing…</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </Pressable>

            <Link href="./sign-in" style={styles.backLink}>
              Back to Sign In
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.bg,
  },
  topBar: {
    height: 4,
    backgroundColor: mobileTheme.accent,
  },
  container: {
    flex: 1,
    backgroundColor: mobileTheme.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 44,
    paddingBottom: 40,
  },
  brandBlock: {
    marginBottom: 32,
  },
  brandEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: mobileTheme.mutedSoft,
    textAlign: "center",
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  brandSubtitle: {
    marginTop: 10,
    fontSize: 15,
    color: mobileTheme.muted,
    fontWeight: "500",
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#52525B",
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: mobileTheme.text,
    fontWeight: "500",
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.dangerBorder,
    backgroundColor: mobileTheme.dangerSoft,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 4,
  },
  errorCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.danger,
  },
  errorCardText: {
    fontSize: 13,
    lineHeight: 19,
    color: mobileTheme.danger,
  },
  button: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: mobileTheme.accent,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  buttonPressed: {
    backgroundColor: mobileTheme.accentPressed,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: mobileTheme.white,
    fontSize: 15,
    fontWeight: "700",
  },
  guestNote: {
    fontSize: 12,
    lineHeight: 18,
    color: mobileTheme.muted,
  },
  backLink: {
    alignSelf: "center",
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.accent,
    marginTop: 8,
  },
});
