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
import { MIN_PASSWORD_LENGTH } from "@attendance/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../providers/auth-provider";
import { checkGuestEmailVerification, finishGuestUpgrade, submitGuestUpgradeEmail } from "../../lib/auth/guest-upgrade";

type Step = "email" | "verify" | "password";

export default function RegisterScreen() {
  const router = useRouter();
  const { refreshSessionContext } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmitEmail() {
    setLoading(true);
    setError(null);

    const result = await submitGuestUpgradeEmail(supabase, email);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setStep("verify");
    setLoading(false);
  }

  async function handleCheckVerification() {
    setLoading(true);
    setError(null);

    const result = await checkGuestEmailVerification(supabase);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.verified) {
      setError("Your email is not verified yet. Click the verification link we sent, then check again.");
      setLoading(false);
      return;
    }

    setStep("password");
    setLoading(false);
  }

  async function handleSetPassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await finishGuestUpgrade(supabase, password);

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Create your account</Text>
            <Text style={styles.title}>
              {step === "email" ? "Register" : step === "verify" ? "Verify your email" : "Set a password"}
            </Text>
            <Text style={styles.subtitle}>
              {step === "email"
                ? "Upgrade your guest account to a permanent QRLog account without losing your activity history."
                : step === "verify"
                  ? `We sent a verification email to ${email}. Confirm your email to continue.`
                  : "Set a password so you can sign in to your QRLog account."}
            </Text>

            {step === "email" ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email address</Text>
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
            ) : null}

            {step === "password" ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
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
                    placeholder="Re-enter your password"
                    placeholderTextColor={mobileTheme.mutedSoft}
                    style={styles.input}
                  />
                </View>
              </>
            ) : null}

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Unable to continue</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              {step === "email" ? (
                <>
                  <Link href="/guest" style={styles.backLink}>
                    Back
                  </Link>
                  <Pressable
                    onPress={() => handleSubmitEmail().catch(() => undefined)}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && !loading ? styles.submitButtonPressed : null,
                      loading ? styles.submitButtonDisabled : null,
                    ]}
                  >
                    {loading ? (
                      <View style={styles.submitInner}>
                        <ActivityIndicator color={mobileTheme.white} />
                        <Text style={styles.submitText}>Sending…</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitText}>Continue</Text>
                    )}
                  </Pressable>
                </>
              ) : null}

              {step === "verify" ? (
                <>
                  <Link href="/sign-in" style={styles.backLink}>
                    Sign in to an existing account
                  </Link>
                  <Pressable
                    onPress={() => handleCheckVerification().catch(() => undefined)}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && !loading ? styles.submitButtonPressed : null,
                      loading ? styles.submitButtonDisabled : null,
                    ]}
                  >
                    {loading ? (
                      <View style={styles.submitInner}>
                        <ActivityIndicator color={mobileTheme.white} />
                        <Text style={styles.submitText}>Checking…</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitText}>I&apos;ve verified my email</Text>
                    )}
                  </Pressable>
                </>
              ) : null}

              {step === "password" ? (
                <Pressable
                  onPress={() => handleSetPassword().catch(() => undefined)}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && !loading ? styles.submitButtonPressed : null,
                    loading ? styles.submitButtonDisabled : null,
                  ]}
                >
                  {loading ? (
                    <View style={styles.submitInner}>
                      <ActivityIndicator color={mobileTheme.white} />
                      <Text style={styles.submitText}>Finishing…</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitText}>Finish registration</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
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
  container: {
    flex: 1,
    backgroundColor: mobileTheme.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    padding: 22,
    gap: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: mobileTheme.mutedSoft,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: mobileTheme.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: mobileTheme.muted,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: mobileTheme.muted,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panelSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: mobileTheme.text,
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.dangerBorder,
    backgroundColor: mobileTheme.dangerSoft,
    padding: 14,
    gap: 4,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.danger,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: mobileTheme.danger,
  },
  actions: {
    gap: 12,
  },
  backLink: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.muted,
  },
  submitButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: mobileTheme.accent,
    paddingHorizontal: 18,
  },
  submitButtonPressed: {
    backgroundColor: mobileTheme.accentPressed,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    color: mobileTheme.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
