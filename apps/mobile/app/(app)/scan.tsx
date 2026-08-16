import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatAttendanceDate, formatAttendanceTime } from "@attendance/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { MobileSecondaryButton, mobileTheme } from "../../components/mobile-ui";
import { supabase } from "../../lib/supabase/client";

interface ScanResult {
  attendance_record_id: string;
  attendance_date: string;
  scan_type: "time_in" | "time_out";
  scanned_at: string;
  time_in: string | null;
  time_out: string | null;
  message: string;
}

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
    return reason.message;
  }

  return "Your attendance was not recorded.";
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

  function handleClose() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

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
      const { data, error: rpcError } = await supabase.rpc("scan_attendance", {
        qr_token: qrToken,
      });

      if (rpcError) {
        throw rpcError;
      }

      const scan = (Array.isArray(data) ? data[0] : data) as ScanResult | null;
      if (!scan) {
        throw new Error("Your attendance was not recorded.");
      }

      setResult(scan);
    } catch (reason) {
      setError(getErrorMessage(reason));
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
          <Text style={styles.lightText}>Allow camera access to scan the attendance QR code.</Text>
          <Pressable style={styles.allowButton} onPress={() => requestPermission().catch(() => undefined)}>
            <Text style={styles.allowButtonText}>Allow camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.lightSafeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.successWrap}>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>✓</Text>
          </View>
          <Text style={styles.successEyebrow}>Attendance recorded</Text>
          <Text style={styles.successTitle}>{result.scan_type === "time_in" ? "Time In Logged" : "Time Out Logged"}</Text>
          <Text style={styles.successSubtitle}>Your attendance has been successfully recorded for the current attendance day.</Text>

          <View style={styles.successCard}>
            <Text style={styles.successTime}>{formatAttendanceTime(result.scanned_at)}</Text>
            <Text style={styles.successDate}>{formatAttendanceDate(result.attendance_date)}</Text>
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
            <Text style={styles.scanEyebrow}>Attendance Scanner</Text>
            <Text style={styles.scanTitle}>Scan Attendance</Text>
            <Text style={styles.scanSubtitle}>{scannerLocked ? "Processing attendance..." : "Align the QR code within the frame."}</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.scanStatusBar}>
          <Text style={styles.scanStatusText}>{scannerLocked ? "Recording attendance..." : "Camera ready"}</Text>
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
              <Text style={styles.processingText}>Processing attendance…</Text>
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
          <Text style={styles.scanFooterText}>Use the active attendance QR issued by the administrator.</Text>
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
