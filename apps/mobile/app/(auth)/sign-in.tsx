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
import { emailSignInSchema } from "@attendance/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTheme } from "../../components/mobile-ui";
import { AppLogo } from "../../components/branding";
import { supabase } from "../../lib/supabase/client";

const CONNECTION_ERROR = "Unable to connect to QRLog. Check your internet connection and try again.";
const GENERIC_ERROR = "Invalid email or password.";

function getFriendlyError(reason: unknown) {
  if (reason instanceof Error) {
    const message = reason.message.toLowerCase();
    if (message.includes("fetch") || message.includes("network") || message.includes("timeout") || message.includes("econnrefused")) {
      return CONNECTION_ERROR;
    }
    if (message.includes("invalid login credentials")) {
      return GENERIC_ERROR;
    }
    return reason.message;
  }

  return GENERIC_ERROR;
}

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignIn() {
    const parsed = emailSignInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? GENERIC_ERROR);
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signInError) {
      setError(getFriendlyError(signInError));
      setLoading(false);
      return;
    }

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
            <AppLogo size={72} style={styles.brandMark} />
            <Text style={styles.brandTitle}>Sign In</Text>
            <Text style={styles.brandSubtitle}>Use your QRLog account email.</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorCardTitle}>Unable to sign in</Text>
                <Text style={styles.errorCardText}>{error}</Text>
              </View>
            ) : null}

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
              onPress={() => handleSignIn().catch(() => undefined)}
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

            <Link href="./community-sign-in" style={styles.communityLink}>
              Sign in with a Community code instead
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
    marginBottom: 36,
  },
  brandMark: {
    alignSelf: "center",
    marginBottom: 14,
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
  },
  communityLink: {
    alignSelf: "center",
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.muted,
  },
});
