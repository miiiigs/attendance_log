import { useState } from "react";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { mobileTheme } from "../../components/mobile-ui";
import { requestPasswordReset } from "../../lib/account";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await requestPasswordReset(email.trim()).catch(() => ({
      success: false as const,
      error: "Unable to send password reset instructions.",
    }));

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(result.message);
    setLoading(false);
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
            <Text style={styles.eyebrow}>Password recovery</Text>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              Enter your account email and we&apos;ll send a secure recovery link to the web reset flow.
            </Text>

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

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Unable to continue</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successCard}>
                <Text style={styles.successTitle}>Check your email</Text>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Link href="./sign-in" style={styles.backLink}>
                Back to sign in
              </Link>
              <Pressable
                onPress={() => handleSubmit().catch(() => undefined)}
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
                  <Text style={styles.submitText}>Send reset link</Text>
                )}
              </Pressable>
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
  successCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.accentBorder,
    backgroundColor: mobileTheme.accentSoft,
    padding: 14,
    gap: 4,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.accent,
  },
  successText: {
    fontSize: 13,
    lineHeight: 19,
    color: mobileTheme.text,
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
