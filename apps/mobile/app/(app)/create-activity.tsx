import { useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import ViewShot, { captureRef, type ViewShotRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { MobileHeading, MobileShell, MobileSoftCard, mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../providers/auth-provider";
import { QRLOG_TERMS_URL } from "../../lib/compliance-links";

interface CreatedResult {
  activityId: string;
  activityName: string;
  token: string;
  source: string;
}

export default function CreateActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ organizationId?: string }>();
  const { isGuest, isRegistered, memberships } = useAuth();

  const administered = useMemo(
    () => memberships.filter((membership) => membership.role === "organization_admin"),
    [memberships],
  );

  const communityContext = params.organizationId
    ? memberships.find((membership) => membership.organizationId === params.organizationId)
    : null;

  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState<string>("public");
  const [visibility, setVisibility] = useState<"community_only" | "anyone_with_code">("community_only");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreatedResult | null>(null);
  const qrCardRef = useRef<ViewShotRef | null>(null);
  const [sharing, setSharing] = useState(false);

  const selectedAdminCommunity = administered.find((membership) => membership.organizationId === ownership);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Activity name is required.");
      return;
    }

    if (!acceptedTerms) {
      setError("You must agree to the Terms of Use and Acceptable Use Policy before creating an activity.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let activityId: string;
      let source: string;

      if (communityContext) {
        const { data, error: rpcError } = await supabase.rpc("create_activity", {
          activity_name: name.trim(),
          target_organization_id: communityContext.organizationId,
          visibility,
          accepted_terms: true,
        });
        if (rpcError) {
          throw rpcError;
        }
        const activity = Array.isArray(data) ? data[0] : data;
        activityId = activity?.id;
        source = communityContext.organization.name;
      } else if (selectedAdminCommunity) {
        const { data, error: rpcError } = await supabase.rpc("create_activity", {
          activity_name: name.trim(),
          target_organization_id: selectedAdminCommunity.organizationId,
          visibility,
          accepted_terms: true,
        });
        if (rpcError) {
          throw rpcError;
        }
        const activity = Array.isArray(data) ? data[0] : data;
        activityId = activity?.id;
        source = selectedAdminCommunity.organization.name;
      } else {
        const { data, error: rpcError } = await supabase.rpc("create_public_activity", {
          activity_name: name.trim(),
          accepted_terms: true,
        });
        if (rpcError) {
          throw rpcError;
        }
        const activity = Array.isArray(data) ? data[0] : data;
        activityId = activity?.id;
        source = "Public";
      }

      if (!activityId) {
        throw new Error("Activity created but its id could not be resolved.");
      }

      const { data: qrData, error: qrError } = await supabase.rpc("create_activity_qr_session", {
        target_activity_id: activityId,
        ttl_seconds: 18000,
      });

      if (qrError) {
        throw qrError;
      }

      const qr = Array.isArray(qrData) ? qrData[0] : qrData;
      if (!qr?.token) {
        throw new Error("Unable to generate the activity QR.");
      }

      setResult({ activityId, activityName: name.trim(), token: qr.token, source });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the activity.");
    } finally {
      setLoading(false);
    }
  }

  async function shareQrImage() {
    if (!result || !qrCardRef.current) {
      return;
    }

    setSharing(true);
    try {
      const uri = await captureRef(qrCardRef, {
        format: "png",
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share activity QR",
        });
      }
    } catch {
      // Sharing is best-effort; ignore and let the user dismiss the screen.
    } finally {
      setSharing(false);
    }
  }

  if (isGuest) {
    return (
      <MobileShell route="/">
        <MobileHeading eyebrow="QRLog" title="Create Activity" subtitle="Host an activity." />
        <MobileSoftCard>
          <Text style={styles.guestTitle}>Create an account to host activities</Text>
          <Text style={styles.guestText}>Creating activities requires a registered QRLog account.</Text>
          <Pressable onPress={() => router.push("/register")} style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}>
            <Text style={styles.buttonText}>Register</Text>
          </Pressable>
        </MobileSoftCard>
      </MobileShell>
    );
  }

  if (result) {
    return (
      <MobileShell route="/">
        <MobileHeading eyebrow="QRLog" title="Activity Created" subtitle={result.source} />
        <ViewShot ref={qrCardRef} options={{ format: "png", quality: 1 }} style={styles.resultCard}>
          <Text style={styles.resultBrand}>QRLog</Text>
          <Text style={styles.resultName}>{result.activityName}</Text>
          <Text style={styles.resultSource}>{result.source}</Text>
          <View style={styles.qrWrap}>
            <QRCode value={`attendance://${result.token}`} size={200} color="#123b32" backgroundColor="#ffffff" />
          </View>
          <Text style={styles.resultNote}>Scan. Log. Done.</Text>
        </ViewShot>
        <Pressable onPress={() => shareQrImage().catch(() => undefined)} disabled={sharing} style={({ pressed }) => [styles.button, pressed && !sharing ? styles.pressed : null, sharing ? styles.buttonDisabled : null]}>
          {sharing ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator color={mobileTheme.white} />
              <Text style={styles.buttonText}>Preparing…</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Share / Save QR Image</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.replace("/")} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
          <Text style={styles.secondaryButtonText}>Done</Text>
        </Pressable>
      </MobileShell>
    );
  }

  return (
    <MobileShell route="/">
      <MobileHeading eyebrow="QRLog" title="Create Activity" subtitle={communityContext ? `Under ${communityContext.organization.name}` : "Host a new activity."} />

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Activity name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. General Assembly"
            placeholderTextColor={mobileTheme.mutedSoft}
            maxLength={200}
            style={styles.input}
          />
        </View>

        {isRegistered && !communityContext && administered.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Create activity under</Text>
            <Pressable
              onPress={() => setOwnership("public")}
              style={[styles.option, ownership === "public" ? styles.optionActive : null]}
            >
              <Text style={[styles.optionText, ownership === "public" ? styles.optionTextActive : null]}>Public</Text>
            </Pressable>
            {administered.map((membership) => (
              <Pressable
                key={membership.id}
                onPress={() => setOwnership(membership.organizationId)}
                style={[styles.option, ownership === membership.organizationId ? styles.optionActive : null]}
              >
                <Text style={[styles.optionText, ownership === membership.organizationId ? styles.optionTextActive : null]}>
                  {membership.organization.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {communityContext || selectedAdminCommunity ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Activity access</Text>
            <Pressable
              onPress={() => setVisibility("community_only")}
              style={[styles.option, visibility === "community_only" ? styles.optionActive : null]}
            >
              <Text style={[styles.optionText, visibility === "community_only" ? styles.optionTextActive : null]}>
                Community members only
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVisibility("anyone_with_code")}
              style={[styles.option, visibility === "anyone_with_code" ? styles.optionActive : null]}
            >
              <Text style={[styles.optionText, visibility === "anyone_with_code" ? styles.optionTextActive : null]}>
                Anyone with QR/activity code
              </Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.termsRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            onPress={() => setAcceptedTerms((value) => !value)}
            style={[styles.checkbox, acceptedTerms ? styles.checkboxChecked : null]}
          >
            {acceptedTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </Pressable>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(QRLOG_TERMS_URL).catch(() => undefined)}>
              Terms of Use and Acceptable Use Policy
            </Text>
            .
          </Text>
        </View>

        <Pressable
          onPress={() => handleCreate().catch(() => undefined)}
          disabled={loading}
          style={({ pressed }) => [styles.button, pressed && !loading ? styles.pressed : null, loading ? styles.buttonDisabled : null]}
        >
          {loading ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator color={mobileTheme.white} />
              <Text style={styles.buttonText}>Creating…</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Create Activity</Text>
          )}
        </Pressable>
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
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
  option: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionActive: {
    borderColor: mobileTheme.accent,
    backgroundColor: mobileTheme.accentSoft,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: mobileTheme.text,
  },
  optionTextActive: {
    color: mobileTheme.accent,
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
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: mobileTheme.accent,
    backgroundColor: mobileTheme.accent,
  },
  checkboxMark: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "800",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
  termsLink: {
    color: mobileTheme.accent,
    fontWeight: "800",
    textDecorationLine: "underline",
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
  pressed: {
    opacity: 0.86,
  },
  guestTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  guestText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
  resultCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: "#FFFFFF",
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  resultBrand: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: mobileTheme.accent,
  },
  resultName: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTheme.text,
    textAlign: "center",
  },
  resultSource: {
    fontSize: 13,
    color: mobileTheme.muted,
  },
  qrWrap: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  resultNote: {
    fontSize: 12,
    color: mobileTheme.muted,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: mobileTheme.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
