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
import { organizationLoginSchema } from "@attendance/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";
import { getAdminAppUrl } from "../../lib/config";
import type { LoginContextPayload } from "../../providers/auth-provider";
import { useAuth } from "../../providers/auth-provider";

const CONNECTION_ERROR = "Unable to connect to Activity Log. Check your internet connection and try again.";
const GENERIC_ERROR = "Invalid organization code, username, or password.";

interface LoginResponse {
  error?: string;
  access_token?: string;
  refresh_token?: string;
  organization?: LoginContextPayload["organization"];
  membership?: LoginContextPayload["membership"];
  profile?: LoginContextPayload["profile"];
}

function getFriendlyError(reason: unknown, serverError?: string) {
  if (serverError) {
    return serverError;
  }

  if (reason instanceof Error) {
    const message = reason.message.toLowerCase();
    if (message.includes("fetch") || message.includes("network") || message.includes("timeout") || message.includes("econnrefused")) {
      return CONNECTION_ERROR;
    }
  }

  return GENERIC_ERROR;
}

export default function LoginScreen() {
  const { applyLoginContext } = useAuth();
  const [organizationCode, setOrganizationCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    const parsed = organizationLoginSchema.safeParse({ organizationCode, username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? GENERIC_ERROR);
      return;
    }

    setLoading(true);
    setError(null);

    let response: Response;
    try {
      response = await fetch(`${getAdminAppUrl()}/api/auth/mobile-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });
    } catch (reason) {
      setError(getFriendlyError(reason));
      setLoading(false);
      return;
    }

    let result: LoginResponse;
    try {
      result = (await response.json()) as LoginResponse;
    } catch {
      setError(CONNECTION_ERROR);
      setLoading(false);
      return;
    }

    if (!response.ok || !result.access_token || !result.refresh_token || !result.organization || !result.membership) {
      setError(result.error ?? GENERIC_ERROR);
      setLoading(false);
      return;
    }

    const { error: sessionError, data } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });

    if (sessionError || !data.session?.user) {
      setError(getFriendlyError(sessionError ?? new Error(GENERIC_ERROR)));
      setLoading(false);
      return;
    }

    await applyLoginContext({
      organization: result.organization,
      membership: result.membership,
      profile: result.profile ?? {
        id: data.session.user.id,
        firstName: "",
        lastName: "",
        email: data.session.user.email ?? "",
        status: "active",
      },
    });

    setLoading(false);
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
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>AL</Text>
            </View>
            <Text style={styles.brandTitle}>Activity Log</Text>
            <Text style={styles.brandSubtitle}>Sign in with your organization to record activities.</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorCardTitle}>Unable to sign in</Text>
                <Text style={styles.errorCardText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Organization Code</Text>
              <TextInput
                value={organizationCode}
                onChangeText={setOrganizationCode}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="organization"
                placeholder="e.g. SCPPA"
                placeholderTextColor={mobileTheme.mutedSoft}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                placeholder="Enter your username"
                placeholderTextColor={mobileTheme.mutedSoft}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={mobileTheme.mutedSoft}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>{showPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
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
                  <Text style={styles.buttonText}>Signing in…</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>

            <Link href="./forgot-password" style={styles.forgotPasswordLink}>
              Forgot password?
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
    marginBottom: 44,
  },
  brandMark: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: mobileTheme.accent,
  },
  brandMarkText: {
    color: mobileTheme.white,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 2,
  },
  brandTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    marginTop: 10,
    fontSize: 15,
    color: mobileTheme.muted,
    fontWeight: "500",
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
  passwordWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: mobileTheme.panel,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: mobileTheme.text,
    fontWeight: "500",
  },
  passwordToggle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  passwordToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.muted,
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
  forgotPasswordLink: {
    alignSelf: "center",
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.accent,
    marginTop: 2,
  },
});
