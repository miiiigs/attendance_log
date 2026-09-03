import { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MobileHeading, MobileShell, MobileSoftCard, mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../providers/auth-provider";

export default function JoinCommunityScreen() {
  const router = useRouter();
  const { isGuest, isRegistered, refreshSessionContext } = useAuth();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter a Community code.");
      return;
    }

    if (!displayName.trim()) {
      setError("Enter your display name in this Community.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("join_organization_by_code", {
        community_code: trimmed,
        community_display_name: displayName.trim(),
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.membership_id) {
        throw new Error("Unable to join the Community.");
      }

      await refreshSessionContext();
      setSuccess(`You joined ${result.organization_name ?? "the Community"} as a member.`);
      setCode("");
      setDisplayName("");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to join the Community.";
      if (message === "Create an account and verify your email before joining a Community.") {
        setError("You need a registered, verified account to join a Community. Register first to keep your activity history.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileShell route="/communities">
      <MobileHeading eyebrow="QRLog" title="Join Community" subtitle="Enter a Community Code to join." />

      {isGuest ? (
        <MobileSoftCard style={styles.registerCard}>
          <Text style={styles.registerTitle}>Create an account to join</Text>
          <Text style={styles.registerText}>Joining a Community requires a registered, verified email account. Register to keep your activity history.</Text>
          <Pressable onPress={() => router.push("/register")} style={({ pressed }) => [styles.registerButton, pressed ? styles.pressed : null]}>
            <Text style={styles.registerButtonText}>Register</Text>
          </Pressable>
        </MobileSoftCard>
      ) : null}

      {isRegistered ? (
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Community Code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="e.g. SCPPA"
              placeholderTextColor={mobileTheme.mutedSoft}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Display name in this Community</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="How you will appear to members"
              placeholderTextColor={mobileTheme.mutedSoft}
              style={styles.input}
            />
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successCard}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => handleJoin().catch(() => undefined)}
            disabled={loading}
            style={({ pressed }) => [styles.button, pressed && !loading ? styles.pressed : null, loading ? styles.buttonDisabled : null]}
          >
            {loading ? (
              <View style={styles.buttonInner}>
                <ActivityIndicator color={mobileTheme.white} />
                <Text style={styles.buttonText}>Joining…</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Join Community</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  registerCard: {
    gap: 8,
  },
  registerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  registerText: {
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
  registerButton: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
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
    color: mobileTheme.muted,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
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
  },
  successText: {
    fontSize: 13,
    lineHeight: 19,
    color: mobileTheme.accent,
  },
  button: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
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
});
