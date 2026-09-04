import { useState } from "react";
import { Link } from "expo-router";
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
import { GoogleGlyph } from "../../components/google-glyph";
import { supabase } from "../../lib/supabase/client";
import { createAccount } from "../../lib/auth/signup";
import { signInWithGoogle } from "../../lib/auth/google-native";

export default function CreateAccountScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleCreateAccount() {
    setLoading(true);
    setError(null);
    setVerificationEmail(null);

    const result = await createAccount(supabase, {
      displayName,
      email,
      password,
      confirmPassword,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.requiresEmailConfirmation) {
      setVerificationEmail(email.trim().toLowerCase());
      setLoading(false);
      return;
    }

    // Rarely, Confirm Email is off and Supabase returns a session directly;
    // the auth listener signs the user in and navigation moves to Home.
    setLoading(false);
    return;
  }

  async function handleContinueWithGoogle() {
    setGoogleLoading(true);
    setError(null);

    const result = await signInWithGoogle(supabase);

    if (!result.ok && result.error) {
      setError(result.error);
    }

    setGoogleLoading(false);
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
            <Text style={styles.brandEyebrow}>New to QRLog?</Text>
            <Text style={styles.brandTitle}>Create your account</Text>
            <Text style={styles.brandSubtitle}>Sign in with your email on any device.</Text>
          </View>

          {verificationEmail ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                We sent a verification link to {verificationEmail}. Confirm your email, then you can sign in to QRLog.
              </Text>
              <Link href="./sign-in" style={styles.successLink}>
                Back to Sign In
              </Link>
            </View>
          ) : (
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorCardTitle}>Unable to create your account</Text>
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

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={mobileTheme.mutedSoft}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="At least 10 characters"
                  placeholderTextColor={mobileTheme.mutedSoft}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Confirm password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="Re-enter your password"
                  placeholderTextColor={mobileTheme.mutedSoft}
                  style={styles.input}
                />
              </View>

              <Pressable
                onPress={() => handleCreateAccount().catch(() => undefined)}
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
                    <Text style={styles.buttonText}>Creating account…</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={() => handleContinueWithGoogle().catch(() => undefined)}
                disabled={googleLoading}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !googleLoading ? styles.secondaryButtonPressed : null,
                  googleLoading ? styles.buttonDisabled : null,
                ]}
              >
                {googleLoading ? (
                  <View style={styles.secondaryButtonInner}>
                    <ActivityIndicator color={mobileTheme.text} />
                    <Text style={styles.secondaryButtonText}>Opening Google…</Text>
                  </View>
                ) : (
                  <View style={styles.secondaryButtonInner}>
                    <GoogleGlyph />
                    <Text style={styles.secondaryButtonText}>Continue with Google</Text>
                  </View>
                )}
              </Pressable>

              <Link href="./sign-in" style={styles.signInLink}>
                Already have an account? Sign In
              </Link>
            </View>
          )}
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  brandBlock: {
    marginBottom: 28,
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
    marginTop: 8,
    fontSize: 14,
    color: mobileTheme.muted,
    fontWeight: "500",
    textAlign: "center",
  },
  form: {
    gap: 14,
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
  button: {
    marginTop: 8,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#D4D4D8",
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: mobileTheme.mutedSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 16,
  },
  secondaryButtonPressed: {
    backgroundColor: "#F4F4F5",
  },
  secondaryButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: mobileTheme.text,
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
  successCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: mobileTheme.accentBorder,
    backgroundColor: mobileTheme.accentSoft,
    padding: 20,
    gap: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTheme.accent,
  },
  successText: {
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.text,
  },
  successLink: {
    alignSelf: "flex-start",
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.accent,
  },
  signInLink: {
    alignSelf: "center",
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.accent,
    marginTop: 10,
  },
});
