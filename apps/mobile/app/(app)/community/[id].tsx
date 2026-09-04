import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatDateInTimeZone, getDisplayName } from "@attendance/shared";
import { MobileCard, MobileHeading, MobileLabel, MobileShell, MobileStatusChip, mobileTheme } from "../../../components/mobile-ui";
import { OrganizationLogo } from "../../../components/branding";
import { useAuth } from "../../../providers/auth-provider";
import { supabase } from "../../../lib/supabase/client";
import { getOrgTimezone } from "../../../lib/config";
import {
  canLoadCommunityActivities,
  COMMUNITY_ACTIVITIES_ERROR,
  loadCommunityActivities,
  normalizeCommunityRouteId,
  type CommunityActivity,
  type CommunityActivitiesClient,
} from "../../../lib/community-activities";
import { updateCommunityDisplayName } from "../../../lib/display-name";

export default function CommunityPage() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const { profile, memberships, loading: authLoading, refreshSessionContext } = useAuth();
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  const communityId = normalizeCommunityRouteId(id);
  const membership = memberships.find((item) => item.organizationId === communityId);
  const isAdmin = membership?.role === "organization_admin";
  const timezone = getOrgTimezone(membership?.organization.timezone);
  const memberDisplayName =
    membership?.displayName ??
    getDisplayName(profile?.firstName, profile?.lastName, profile?.displayName) ??
    membership?.username ??
    "Member";

  useEffect(() => {
    if (!communityId || !canLoadCommunityActivities(communityId, membership?.organizationId)) {
      setActivities([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    const activeCommunityId = communityId;

    async function load() {
      setLoading(true);
      setError(null);

      const data = await loadCommunityActivities(supabase as unknown as CommunityActivitiesClient, activeCommunityId);
      if (!active) {
        return;
      }

      setActivities(data);
      setLoading(false);
    }

    load().catch((queryError: { message?: string }) => {
      if (active) {
        if (__DEV__ && queryError?.message) {
          console.warn(`[community] activity load failed for ${activeCommunityId}: ${queryError.message}`);
        }
        setError(COMMUNITY_ACTIVITIES_ERROR);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [communityId, membership?.organizationId]);

  function startEditName() {
    setNameInput(memberDisplayName);
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
    if (!communityId) {
      return;
    }

    setNameLoading(true);
    setNameError(null);
    setNameSuccess(null);

    const result = await updateCommunityDisplayName(supabase, communityId, nameInput);

    if (!result.ok) {
      setNameError(result.error);
      setNameLoading(false);
      return;
    }

    await refreshSessionContext();
    setEditingName(false);
    setNameInput("");
    setNameSuccess("Your Community display name was updated.");
    setNameLoading(false);
  }

  if (!membership) {
    return (
      <MobileShell route="/communities">
        <MobileHeading
          eyebrow="QRLog"
          title="Community"
          subtitle={authLoading && communityId ? "Loading Community..." : "Community not found."}
        />
      </MobileShell>
    );
  }

  return (
    <MobileShell route="/communities">
      <MobileHeading eyebrow={membership.organization.code} title={membership.organization.name} subtitle="Community" />

      <View style={styles.identityCard}>
        <OrganizationLogo organization={membership.organization} size={56} />
        <View style={styles.identityBody}>
          <Text style={styles.identityName}>{membership.organization.name}</Text>
          <Text style={styles.identityRole}>{isAdmin ? "Community Admin" : "Member"} · {memberDisplayName}</Text>
        </View>
      </View>

      <MobileCard>
        <MobileLabel>Community display name</MobileLabel>
        {editingName ? (
          <View style={styles.nameEditStack}>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="How you appear to members"
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
            <Text style={styles.nameDisplayValue}>{memberDisplayName}</Text>
            <Pressable onPress={startEditName} style={({ pressed }) => [styles.editNameButton, pressed ? styles.pressed : null]}>
              <Text style={styles.editNameButtonText}>Edit display name</Text>
            </Pressable>
          </View>
        )}
      </MobileCard>

      <MobileCard>
        <MobileLabel>About this Community</MobileLabel>
        <Text style={styles.description}>{membership.organization.description || "No description has been added yet."}</Text>
      </MobileCard>

      {isAdmin ? (
        <Pressable
          onPress={() => router.push({ pathname: "/create-activity", params: { organizationId: communityId } })}
          style={({ pressed }) => [styles.createButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.createButtonText}>Create Activity</Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Recent Activities</Text>
        {loading ? (
          <MobileCard style={styles.loadingCard}>
            <ActivityIndicator color={mobileTheme.accent} />
          </MobileCard>
        ) : error ? (
          <MobileCard>
            <Text style={styles.errorText}>{error}</Text>
          </MobileCard>
        ) : activities.length ? (
          activities.map((activity) => (
            <MobileCard key={activity.id}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderBlock}>
                  <Text style={styles.activityName}>{activity.name}</Text>
                  <Text style={styles.dateMeta}>{formatDateInTimeZone(activity.started_at, timezone)}</Text>
                </View>
                <MobileStatusChip label={activity.visibility === "anyone_with_code" ? "Anyone with code" : "Members only"} tone="neutral" />
              </View>
            </MobileCard>
          ))
        ) : (
          <MobileCard>
            <Text style={styles.empty}>No activities yet.</Text>
          </MobileCard>
        )}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: mobileTheme.border,
    backgroundColor: mobileTheme.panel,
    borderRadius: 20,
    padding: 16,
  },
  identityBody: {
    flex: 1,
  },
  identityName: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTheme.text,
  },
  identityRole: {
    marginTop: 3,
    fontSize: 13,
    color: mobileTheme.muted,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: mobileTheme.muted,
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
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nameSaveText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  createButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: mobileTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: mobileTheme.white,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: mobileTheme.muted,
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  errorText: {
    color: mobileTheme.danger,
    fontSize: 13,
    lineHeight: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderBlock: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: "800",
    color: mobileTheme.text,
    letterSpacing: -0.3,
  },
  dateMeta: {
    marginTop: 4,
    fontSize: 12,
    color: mobileTheme.mutedSoft,
  },
  empty: {
    color: mobileTheme.muted,
    textAlign: "center",
    fontSize: 14,
  },
});
