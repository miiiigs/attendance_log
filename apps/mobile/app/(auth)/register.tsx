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
import { registerSchema } from "@attendance/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";
import { getAdminAppUrl } from "../../lib/config";
import { useAuth } from "../../providers/auth-provider";

const CONNECTION_ERROR = "Unable to connect to QRLog. Check your internet connection and try again.";

interface UpgradeResponse {
  error?: string;
  access_token?: string;
  refresh_token?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { refreshSessionContext, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const parsed = registerSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email and password.");
      return;
    }

    if (!session) {
      setError("Your session expired. Please start again.");
      return;
    }

    setLoading(true);
    setError(null);

    let response: Response;
    try {
      response = await fetch(`${getAdminAppUrl()}/api/auth/mobile-upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: parsed.data.email, password: parsed.data.password }),
      });
    } catch {
      setError(CONNECTION_ERROR);
      setLoading(false);
      return;
    }

    const result = (await response.json().catch(() => null)) as UpgradeResponse | null;

    if (!response.ok || !result?.access_token || !result?.refresh_token) {
      setError(result?.error ?? "Unable to register. Please try again.");
      setLoading(false);
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });

    if (sessionError) {
      setError(sessionError.message);
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
            <Text style={styles.title}>Register</Text>
            <Text style={styles.subtitle}>Keep your activity history by upgrading to an email account.</Text>

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

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
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
                placeholder="Re-enter your password"
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

            <View style={styles.actions}>
              <Link href="/onboarding" style={styles.backLink}>
                Back
              </Link>
              <Pressable
                onPress={() => handleRegister().catch(() => undefined)}
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
                    <Text style={styles.submitText}>Registering…</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>Create account</Text>
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
