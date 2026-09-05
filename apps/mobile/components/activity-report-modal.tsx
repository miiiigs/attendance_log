import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  blockActivityOrganizer,
  reportReasons,
  submitActivityReport,
  type ReportReason,
  type ReportTarget,
} from "../lib/reports";
import { mobileTheme } from "./mobile-ui";

const GENERIC_FAILURE = "Unable to submit your report. Please try again.";
const GENERIC_BLOCK_FAILURE = "Unable to block this organizer. Please try again.";
const SUCCESS = "Thanks. Your report has been submitted for review.";
const BLOCK_SUCCESS = "Organizer blocked. Their activities will be hidden for your account.";

export function ActivityReportModal({
  activityId,
  activityName,
  canReportOrganizer,
  visible,
  onClose,
}: {
  activityId: string;
  activityName: string;
  canReportOrganizer: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setTarget(null);
    setReason(null);
    setDetails("");
    setBlocking(false);
    setMessage(null);
    setError(null);
    onClose();
  }

  async function submit() {
    if (!target || !reason) {
      setError("Choose what you are reporting and a reason.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitActivityReport({
        activityId,
        target,
        reason,
        details,
      });
      setMessage(SUCCESS);
    } catch {
      setError(GENERIC_FAILURE);
    } finally {
      setSubmitting(false);
    }
  }

  async function blockOrganizer() {
    setBlocking(true);
    setError(null);
    try {
      await blockActivityOrganizer(activityId);
      setMessage(BLOCK_SUCCESS);
    } catch {
      setError(GENERIC_BLOCK_FAILURE);
    } finally {
      setBlocking(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <SafeAreaView style={styles.backdrop} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          style={styles.keyboardView}
        >
          <View style={styles.sheet}>
            <Text style={styles.eyebrow}>Report</Text>
            <Text style={styles.title} numberOfLines={2}>
              {activityName}
            </Text>

            {message ? (
              <View style={styles.success}>
                <Text style={styles.successText}>{message}</Text>
                <Pressable onPress={resetAndClose} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <ScrollView
                  style={styles.scrollArea}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  <View style={styles.section}>
                    <Text style={styles.label}>What are you reporting?</Text>
                    <View style={styles.choiceGrid}>
                      <Choice label="Report activity" selected={target === "activity"} onPress={() => setTarget("activity")} />
                      {canReportOrganizer ? (
                        <Choice label="Report organizer" selected={target === "organizer"} onPress={() => setTarget("organizer")} />
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.label}>Reason</Text>
                    <View style={styles.reasonList}>
                      {reportReasons.map((item) => (
                        <Choice
                          key={item.value}
                          label={item.label}
                          selected={reason === item.value}
                          onPress={() => setReason(item.value)}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.label}>Details optional</Text>
                    <TextInput
                      value={details}
                      onChangeText={setDetails}
                      multiline
                      maxLength={1000}
                      placeholder="Add anything reviewers should know."
                      placeholderTextColor={mobileTheme.mutedSoft}
                      style={styles.textArea}
                    />
                  </View>

                  {canReportOrganizer ? (
                    <View style={styles.blockSection}>
                      <Text style={styles.label}>Organizer</Text>
                      <Pressable
                        onPress={() => blockOrganizer().catch(() => undefined)}
                        disabled={submitting || blocking}
                        style={styles.blockButton}
                      >
                        {blocking ? (
                          <ActivityIndicator color={mobileTheme.danger} />
                        ) : (
                          <Text style={styles.blockButtonText}>Block organizer</Text>
                        )}
                      </Pressable>
                    </View>
                  ) : null}
                </ScrollView>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.actions}>
                  <Pressable onPress={resetAndClose} disabled={submitting || blocking} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => submit().catch(() => undefined)}
                    disabled={submitting || blocking}
                    style={styles.primaryButton}
                  >
                    {submitting ? (
                      <ActivityIndicator color={mobileTheme.white} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Submit report</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, selected ? styles.choiceSelected : null]}>
      <Text style={[styles.choiceText, selected ? styles.choiceTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: mobileTheme.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  eyebrow: {
    color: mobileTheme.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    color: mobileTheme.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
  },
  form: {
    marginTop: 18,
    minHeight: 0,
    gap: 16,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 4,
  },
  scrollArea: {
    flexShrink: 1,
  },
  section: {
    gap: 8,
  },
  label: {
    color: mobileTheme.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonList: {
    gap: 8,
  },
  choice: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceSelected: {
    borderColor: mobileTheme.accent,
    backgroundColor: mobileTheme.accentSoft,
  },
  choiceText: {
    color: mobileTheme.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  choiceTextSelected: {
    color: mobileTheme.accent,
  },
  textArea: {
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: mobileTheme.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  blockSection: {
    gap: 8,
  },
  blockButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: mobileTheme.dangerBorder,
    backgroundColor: mobileTheme.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  blockButtonText: {
    color: mobileTheme.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  error: {
    color: mobileTheme.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  success: {
    marginTop: 18,
    gap: 14,
  },
  successText: {
    color: mobileTheme.accent,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
  },
  secondaryButtonText: {
    color: mobileTheme.text,
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: mobileTheme.accent,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
