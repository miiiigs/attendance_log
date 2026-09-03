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
import { displayNameSchema } from "@attendance/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTheme } from "../../components/mobile-ui";
import { AppLogo } from "../../components/branding";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../providers/auth-provider";

const CONNECTION_ERROR = "Unable to connect to QRLog. Check your internet connection and try again.";

export default function OnboardingScreen() {
  const router = useRouter();
  const { refreshSessionContext } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinueAsGuest() {
    const parsed = displayNameSchema.safeParse(displayName);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a display name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        throw signInError;
      }

      const { error: profileError } = await supabase.rpc("create_guest_profile", {
        display_name: parsed.data,
      });

      if (profileError) {
        throw profileError;
      }

      await refreshSessionContext();
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : CONNECTION_ERROR);
      setLoading(false);
    }
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
            <AppLogo size={84} style={styles.brandMark} />
            <Text style={styles.brandTitle}>QRLog</Text>
            <Text style={styles.brandSubtitle}>Scan. Log. Done.</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorCardTitle}>Unable to continue</Text>
                <Text style={styles.errorCardText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Enter your display name</Text>
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

            <Text style={styles.guestNote}>You can join public activities right away, no account required.</Text>
          </View>

          <Link href="./sign-in" style={styles.signInLink}>
            Already have an account? Sign In
          </Link>
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
    marginBottom: 44,
  },
  brandMark: {
    alignSelf: "center",
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 30,
    lineHeight: 36,
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
    textAlign: "center",
  },
  signInLink: {
    alignSelf: "center",
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.accent,
    marginTop: 28,
  },
});
