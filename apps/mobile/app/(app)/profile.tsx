import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getDisplayName } from "@attendance/shared";
import {
  MobileCard,
  MobileHeading,
  MobileInfoRow,
  MobileLabel,
  MobileSecondaryButton,
  MobileShell,
  MobileSoftCard,
  MobileStatusChip,
  mobileTheme,
} from "../../components/mobile-ui";
import { changeMobilePassword } from "../../lib/account";
import { QRLOG_DELETE_ACCOUNT_URL, QRLOG_PRIVACY_POLICY_URL } from "../../lib/compliance-links";
import { updateGlobalDisplayName } from "../../lib/display-name";
import { unblockUser } from "../../lib/reports";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../providers/auth-provider";

interface BlockedOrganizer {
  blocked_user_id: string;
  created_at: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, memberships, session, isGuest, signOut, refreshSessionContext } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [blockedOrganizers, setBlockedOrganizers] = useState<BlockedOrganizer[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  useEffect(() => {
    // Reset password fields when switching between guest/registered states.
    setOldPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError(null);
    setSuccess(null);
    setEditingName(false);
    setNameInput("");
    setNameError(null);
    setNameSuccess(null);
    setBlockedOrganizers([]);
    setBlocksError(null);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    const profileId = profile.id;
    let active = true;

    async function loadBlockedOrganizers() {
      setBlocksLoading(true);
      setBlocksError(null);
      const { data, error: queryError } = await supabase
        .from("user_blocks")
        .select("blocked_user_id, created_at")
        .eq("blocker_user_id", profileId)
        .order("created_at", { ascending: false });

      if (!active) {
        return;
      }

      if (queryError) {
        setBlocksError("Unable to load blocked organizers.");
        setBlocksLoading(false);
        return;
      }

      setBlockedOrganizers((data ?? []) as BlockedOrganizer[]);
      setBlocksLoading(false);
    }

    loadBlockedOrganizers().catch(() => {
      if (active) {
        setBlocksError("Unable to load blocked organizers.");
        setBlocksLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [profile?.id]);

  if (!profile) {
    return null;
  }

  const displayName = getDisplayName(profile.firstName, profile.lastName, profile.displayName) || "Guest";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleChangePassword() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await changeMobilePassword(supabase, session, {
      oldPassword,
      newPassword,
      confirmNewPassword,
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSuccess("Your password was updated successfully.");
    setLoading(false);
  }

  function startEditName() {
    setNameInput(displayName);
    setNameError(null);
    setNameSuccess(null);
    setEditingName(true);
  }

  function cancelEditName() {
    setEditingName(false);
    setNameInput("");
    setNameError(null);
    setNameSuccess(null);
  }

  async function handleSaveName() {
    setNameLoading(true);
    setNameError(null);
    setNameSuccess(null);

    const result = await updateGlobalDisplayName(supabase, nameInput);

    if (!result.ok) {
      setNameError(result.error);
      setNameLoading(false);
      return;
    }

    await refreshSessionContext();
    setEditingName(false);
    setNameInput("");
    setNameSuccess("Your display name was updated.");
    setNameLoading(false);
  }

  function openExternalUrl(url: string) {
    Linking.openURL(url).catch(() => undefined);
  }

  async function handleUnblock(userId: string) {
    setUnblockingUserId(userId);
    setBlocksError(null);
    try {
      await unblockUser(userId);
      setBlockedOrganizers((items) => items.filter((item) => item.blocked_user_id !== userId));
    } catch {
      setBlocksError("Unable to unblock organizer. Please try again.");
    } finally {
      setUnblockingUserId(null);
    }
  }

  return (
    <MobileShell route="/profile">
      <MobileHeading eyebrow="QRLog" title="Profile" subtitle={isGuest ? "Guest account" : "Registered account"} />

      <View style={styles.identityCard}>
        <View style={styles.identityBadge}>
          <Text style={styles.identityBadgeText}>{initials}</Text>
        </View>
        <Text style={styles.identityName}>{displayName}</Text>
        <Text style={styles.identitySub}>{isGuest ? "Guest" : profile.email ?? ""}</Text>
        <View style={styles.identityStatus}>
          <MobileStatusChip label={isGuest ? "Guest" : "Registered"} tone={isGuest ? "warning" : "success"} />
        </View>
      </View>

      <MobileCard>
        <MobileLabel>Display name</MobileLabel>
        {editingName ? (
          <View style={styles.nameEditStack}>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Your display name"
              placeholderTextColor={mobileTheme.mutedSoft}
              style={styles.input}
            />
            {nameError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{nameError}</Text>
              </View>
            ) : null}
            {nameSuccess ? (
              <View style={styles.successCard}>
                <Text style={styles.successText}>{nameSuccess}</Text>
              </View>
            ) : null}
            <View style={styles.nameActionsRow}>
              <Pressable
                onPress={cancelEditName}
                disabled={nameLoading}
                style={({ pressed }) => [styles.nameActionButton, pressed && !nameLoading ? styles.pressed : null]}
              >
                <Text style={styles.nameActionText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSaveName().catch(() => undefined)}
                disabled={nameLoading}
                style={({ pressed }) => [
                  styles.nameSaveButton,
                  pressed && !nameLoading ? styles.pressed : null,
                  nameLoading ? styles.nameSaveDisabled : null,
                ]}
              >
                {nameLoading ? (
                  <View style={styles.buttonInner}>
                    <ActivityIndicator color={mobileTheme.white} />
                    <Text style={styles.nameSaveText}>Saving…</Text>
                  </View>
                ) : (
                  <Text style={styles.nameSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.nameDisplayRow}>
            <Text style={styles.nameDisplayValue}>{displayName}</Text>
            <Pressable onPress={startEditName} style={({ pressed }) => [styles.editNameButton, pressed ? styles.pressed : null]}>
              <Text style={styles.editNameButtonText}>Edit Name</Text>
            </Pressable>
          </View>
        )}
      </MobileCard>

      {isGuest ? (
        <MobileSoftCard>
          <Text style={styles.upgradeTitle}>Create your account</Text>
          <Text style={styles.upgradeText}>
            Register an email to create activities, join Communities, and keep your history across devices.
          </Text>
          <Pressable onPress={() => router.push("/register")} style={({ pressed }) => [styles.upgradeButton, pressed ? styles.pressed : null]}>
            <Text style={styles.upgradeButtonText}>Register</Text>
          </Pressable>
        </MobileSoftCard>
      ) : null}

      <MobileCard>
        <MobileLabel>Account information</MobileLabel>
        <View style={styles.infoStack}>
          <MobileInfoRow label="Name" value={displayName} />
          {profile.email ? <MobileInfoRow label="Email" value={profile.email} valueStyle={styles.longValue} /> : null}
          <MobileInfoRow label="Communities" value={memberships.length ? String(memberships.length) : "None"} />
        </View>
      </MobileCard>

      {!isGuest ? (
        <MobileCard>
          <MobileLabel>Change password</MobileLabel>
          <View style={styles.passwordStack}>
            <Text style={styles.passwordNote}>
              {memberships.length > 1
                ? `This account is active in ${memberships.length} Communities. Changing the password here updates every QRLog membership tied to this account.`
                : "Changing your password here updates your QRLog sign-in for this account."}
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Current password</Text>
              <TextInput
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor={mobileTheme.mutedSoft}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 10 characters"
                placeholderTextColor={mobileTheme.mutedSoft}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Confirm new password</Text>
              <TextInput
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                placeholder="Re-enter new password"
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
              onPress={() => handleChangePassword().catch(() => undefined)}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.primaryButtonDisabled : null,
              ]}
            >
              {loading ? (
                <View style={styles.buttonInner}>
                  <ActivityIndicator color={mobileTheme.white} />
                  <Text style={styles.primaryButtonText}>Updating…</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Change Password</Text>
              )}
            </Pressable>
          </View>
        </MobileCard>
      ) : null}

      <MobileCard>
        <MobileLabel>Account / Privacy</MobileLabel>
        <View style={styles.privacyStack}>
          <Pressable
            onPress={() => openExternalUrl(QRLOG_PRIVACY_POLICY_URL)}
            style={({ pressed }) => [styles.privacyLinkButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
          </Pressable>
          {!isGuest ? (
            <Pressable
              onPress={() => openExternalUrl(QRLOG_DELETE_ACCOUNT_URL)}
              style={({ pressed }) => [styles.deleteLinkButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.deleteLinkText}>Delete Account</Text>
            </Pressable>
          ) : null}
        </View>
      </MobileCard>

      <MobileCard>
        <MobileLabel>Blocked organizers</MobileLabel>
        <View style={styles.blockedStack}>
          {blocksLoading ? (
            <ActivityIndicator color={mobileTheme.accent} />
          ) : blocksError ? (
            <Text style={styles.errorText}>{blocksError}</Text>
          ) : blockedOrganizers.length ? (
            blockedOrganizers.map((item, index) => (
              <View key={item.blocked_user_id} style={styles.blockedRow}>
                <Text style={styles.blockedLabel}>Blocked organizer {index + 1}</Text>
                <Pressable
                  onPress={() => handleUnblock(item.blocked_user_id).catch(() => undefined)}
                  disabled={unblockingUserId === item.blocked_user_id}
                  style={({ pressed }) => [styles.unblockButton, pressed ? styles.pressed : null]}
                >
                  {unblockingUserId === item.blocked_user_id ? (
                    <ActivityIndicator color={mobileTheme.accent} />
                  ) : (
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  )}
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.blockedEmpty}>No blocked organizers.</Text>
          )}
        </View>
      </MobileCard>

      <MobileSecondaryButton label="Sign Out" onPress={() => signOut().catch(() => undefined)} danger />
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    borderRadius: 24,
    backgroundColor: mobileTheme.accent,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",
  },
  identityBadge: {
    width: 68,
    height: 68,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  identityBadgeText: {
    color: mobileTheme.white,
    fontSize: 22,
    fontWeight: "800",
  },
  identityName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "800",
    color: mobileTheme.white,
    textAlign: "center",
  },
  identitySub: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    textAlign: "center",
  },
  identityStatus: {
    marginTop: 14,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  upgradeText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: mobileTheme.muted,
  },
  upgradeButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
  },
  infoStack: {
    marginTop: 14,
    gap: 14,
  },
  longValue: {
    maxWidth: 200,
  },
  nameEditStack: {
    marginTop: 14,
    gap: 12,
  },
  nameDisplayRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nameDisplayValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: mobileTheme.text,
  },
  editNameButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editNameButtonText: {
    color: mobileTheme.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  nameActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  nameActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  nameActionText: {
    color: mobileTheme.text,
    fontSize: 14,
    fontWeight: "700",
  },
  nameSaveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  nameSaveDisabled: {
    opacity: 0.65,
  },
  nameSaveText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  passwordStack: {
    marginTop: 14,
    gap: 14,
  },
  passwordNote: {
    fontSize: 13,
    lineHeight: 20,
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
    color: mobileTheme.mutedSoft,
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
    paddingHorizontal: 14,
    paddingVertical: 13,
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
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  successText: {
    fontSize: 13,
    lineHeight: 19,
    color: mobileTheme.accent,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: mobileTheme.white,
    fontSize: 15,
    fontWeight: "700",
  },
  privacyStack: {
    marginTop: 14,
    gap: 10,
  },
  privacyLinkButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panelSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyLinkText: {
    color: mobileTheme.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  deleteLinkButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.dangerBorder,
    backgroundColor: mobileTheme.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLinkText: {
    color: mobileTheme.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  blockedStack: {
    marginTop: 14,
    gap: 10,
  },
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panelSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  blockedLabel: {
    flex: 1,
    color: mobileTheme.text,
    fontSize: 14,
    fontWeight: "700",
  },
  blockedEmpty: {
    color: mobileTheme.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  unblockButton: {
    minHeight: 40,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    paddingHorizontal: 12,
  },
  unblockButtonText: {
    color: mobileTheme.accent,
    fontSize: 13,
    fontWeight: "800",
  },
});
