import { useEffect, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDateInTimeZone, formatTimeInTimeZone } from "@attendance/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { MobileSecondaryButton, mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";
import { getOrgTimezone } from "../../lib/config";

interface ScanResult {
  activity_log_id: string;
  activity_id: string;
  activity_name: string;
  scan_type: "time_in";
  scanned_at: string;
  time_in: string | null;
  time_out: string | null;
  message: string;
}

const CONNECTION_ERROR = "Unable to reach the server. Check your connection and try again.";

function getErrorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) {
    return reason.message;
  }

  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof reason.message === "string" &&
    reason.message
  ) {
    if (reason.message === "Activity already completed.") {
      return "Activity already completed. Your activity log for this activity already has both Time In and Time Out.";
    }
    if (reason.message === "Activity is unavailable.") {
      return "This activity is unavailable. Your attendance was not recorded.";
    }
    return reason.message;
  }

  return "Your activity was not recorded.";
}

function extractQrToken(data: string) {
  if (data.startsWith("attendance://")) {
    return data.replace("attendance://", "").trim();
  }

  try {
    const parsed = JSON.parse(data) as { type?: string; token?: string };
    if (parsed.type === "attendance" && typeof parsed.token === "string") {
      return parsed.token;
    }
  } catch {
    // Ignore JSON parse errors and fall through.
  }

  throw new Error("Invalid attendance QR.");
}

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerLocked, setScannerLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const timezone = getOrgTimezone(undefined);

  // Scan is a temporary modal action. Android's hardware Back must return to
  // Home (never exit the app, and never rely on navigation history existing).
  // The listener is registered for the lifetime of this screen and removed on
  // unmount, so it is active across every Scan render branch (permission
  // checking, permission denied, active scanner, error, and success).
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/");
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  function handleClose() {
    router.replace("/");
  }

  async function handleScan(payload: { data: string }) {
    if (scannerLocked) {
      return;
    }

    setScannerLocked(true);
    setError(null);

    try {
      const qrToken = extractQrToken(payload.data);
      const { data, error: rpcError } = await supabase.rpc("scan_activity", {
        qr_token: qrToken,
      });

      if (rpcError) {
        throw rpcError;
      }

      const scan = (Array.isArray(data) ? data[0] : data) as ScanResult | null;
      if (!scan) {
        throw new Error("Your activity was not recorded.");
      }

      setResult(scan);
    } catch (reason) {
      const message = getErrorMessage(reason);
      if (message === CONNECTION_ERROR) {
        setError(message);
      } else {
        setError(message);
      }
      setScannerLocked(false);
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.lightSafeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.lightCenter}>
          <Text style={styles.lightTitle}>Checking camera permission…</Text>
          <Text style={styles.lightText}>The scanner is preparing access to your device camera.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.lightSafeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.lightCenter}>
          <Text style={styles.lightTitle}>Camera access required</Text>
          <Text style={styles.lightText}>Allow camera access to scan the activity QR code.</Text>
          <Pressable style={styles.allowButton} onPress={() => requestPermission().catch(() => undefined)}>
            <Text style={styles.allowButtonText}>Allow camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (result) {
    const scanTime = result.scanned_at;
    const scanDate = new Date(result.scanned_at);

    return (
      <SafeAreaView style={styles.lightSafeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.successWrap}>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>✓</Text>
          </View>
          <Text style={styles.successEyebrow}>Activity Logged</Text>
          <Text style={styles.successTitle}>{result.activity_name}</Text>
          <Text style={styles.successSubtitle}>{result.message}</Text>

          <View style={styles.successCard}>
            <Text style={styles.successTime}>{formatTimeInTimeZone(scanTime, timezone)}</Text>
            <Text style={styles.successDate}>{formatDateInTimeZone(scanDate, timezone)}</Text>
          </View>

          <Pressable
            style={styles.allowButton}
            onPress={() => router.replace({ pathname: "/", params: { refresh: Date.now().toString() } })}
          >
            <Text style={styles.allowButtonText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.darkSafeArea} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.darkContainer}>
        <View style={styles.scanHeader}>
          <View>
            <Text style={styles.scanEyebrow}>Activity Scanner</Text>
            <Text style={styles.scanTitle}>Scan Activity</Text>
            <Text style={styles.scanSubtitle}>{scannerLocked ? "Processing activity..." : "Align the QR code within the frame."}</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.scanStatusBar}>
          <Text style={styles.scanStatusText}>{scannerLocked ? "Recording activity..." : "Camera ready"}</Text>
        </View>

        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleScan}
          />
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <View style={styles.scanLine} />
          </View>
          {scannerLocked ? (
            <View style={styles.processingOverlay}>
              <Text style={styles.processingText}>Processing activity…</Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorPanelTitle}>Scan failed</Text>
            <Text style={styles.errorPanelText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.scanFooter}>
          <Text style={styles.scanFooterText}>Use the active activity QR issued by the administrator.</Text>
        </View>

        {error ? <MobileSecondaryButton label="Close" onPress={handleClose} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  lightSafeArea: {
    flex: 1,
    backgroundColor: mobileTheme.bg,
  },
  darkSafeArea: {
    flex: 1,
    backgroundColor: mobileTheme.dark,
  },
  lightCenter: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  lightTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: mobileTheme.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  lightText: {
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.muted,
    textAlign: "center",
  },
  allowButton: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: mobileTheme.accent,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  allowButtonText: {
    color: mobileTheme.white,
    fontSize: 15,
    fontWeight: "700",
  },
  successWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  successBadge: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: mobileTheme.accentBorder,
    backgroundColor: mobileTheme.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  successBadgeText: {
    color: mobileTheme.accent,
    fontSize: 36,
    fontWeight: "800",
  },
  successEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: mobileTheme.accent,
    textAlign: "center",
  },
  successTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: mobileTheme.text,
    textAlign: "center",
    letterSpacing: -0.8,
  },
  successSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: mobileTheme.muted,
    textAlign: "center",
  },
  successCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: "center",
  },
  successTime: {
    fontSize: 28,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.7,
  },
  successDate: {
    marginTop: 8,
    fontSize: 14,
    color: mobileTheme.muted,
    textAlign: "center",
  },
  darkContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  scanHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  scanEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.52)",
  },
  scanTitle: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "800",
    color: mobileTheme.white,
    letterSpacing: -0.5,
  },
  scanSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.48)",
  },
  scanStatusBar: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scanStatusText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 24,
    lineHeight: 24,
  },
  cameraWrap: {
    flex: 1,
    marginTop: 18,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#0A0F0A",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  scanFrame: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 18,
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: mobileTheme.accent,
  },
  cornerTopLeft: {
    left: 0,
    top: 0,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 14,
  },
  cornerTopRight: {
    right: 0,
    top: 0,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderTopRightRadius: 14,
  },
  cornerBottomLeft: {
    left: 0,
    bottom: 0,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 14,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 14,
  },
  scanLine: {
    position: "absolute",
    left: 18,
    right: 18,
    top: "50%",
    height: 2,
    borderRadius: 999,
    backgroundColor: mobileTheme.accent,
    shadowColor: mobileTheme.accent,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  processingText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  errorPanel: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(254,202,202,0.4)",
    backgroundColor: "rgba(220,38,38,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  errorPanelTitle: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "700",
  },
  errorPanelText: {
    marginTop: 4,
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 19,
  },
  scanFooter: {
    marginTop: 14,
    paddingHorizontal: 6,
  },
  scanFooterText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
