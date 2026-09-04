import { createContext, useContext, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { createRealtimeInvalidationChannel, type RealtimePostgresChange } from "@attendance/shared";
import { supabase } from "../lib/supabase/client";
import { isGuestUser } from "../lib/auth-state";

export interface OrganizationContext {
  id: string;
  code: string;
  slug: string;
  name: string;
  timezone: string;
  description: string | null;
}

export interface MembershipContext {
  id: string;
  userId: string;
  username: string;
  role: string;
  status: string;
  displayName: string | null;
  organizationId: string;
  organization: OrganizationContext;
}

export interface ProfileContext {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  status: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: ProfileContext | null;
  memberships: MembershipContext[];
  loading: boolean;
  isGuest: boolean;
  isRegistered: boolean;
  refreshSessionContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ProfileRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  display_name?: string | null;
  status?: string;
}

function mapProfileRow(row: ProfileRow): ProfileContext {
  return {
    id: row.id,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    displayName: row.display_name ?? null,
    email: row.email ?? null,
    status: row.status ?? "active",
  };
}

/**
 * Non-sensitive display data that the user supplied at signup (or the provider
 * supplied at Google auth). Carried in Auth user metadata only so it survives
 * email confirmation; NEVER used for authorization.
 */
function pickRegisteredDisplayName(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  const candidate =
    typeof metadata.display_name === "string" && metadata.display_name.trim()
      ? metadata.display_name.trim()
      : typeof metadata.full_name === "string" && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : typeof metadata.name === "string" && metadata.name.trim()
          ? metadata.name.trim()
          : null;
  return candidate;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [memberships, setMemberships] = useState<MembershipContext[]>([]);
  const [loading, setLoading] = useState(true);
  const bootstrapAttemptedUserIds = useRef<Set<string>>(new Set());

  /**
   * Server-authoritative, idempotent profile bootstrap for a permanent
   * (non-anonymous) user whose `profiles` row does not exist yet (first email
   * sign-in, new Google user). It never trusts a submitted email and only ever
   * creates a profile for the CURRENT caller.
   */
  async function ensureRegisteredProfile(user: User): Promise<ProfileRow | null> {
    if (isGuestUser(user)) {
      return null;
    }

    if (bootstrapAttemptedUserIds.current.has(user.id)) {
      return null;
    }
    bootstrapAttemptedUserIds.current.add(user.id);

    const displayName = pickRegisteredDisplayName(user);
    const { data, error } = await supabase.rpc("ensure_registered_profile", {
      display_name: displayName ?? null,
    });

    if (error) {
      if (__DEV__) {
        console.warn(`[auth] registered profile bootstrap skipped for ${user.id}: ${error.message}`);
      }
      return null;
    }

    return (data ?? null) as ProfileRow | null;
  }

  async function revalidateContext(activeSession: Session) {
    const userId = activeSession.user.id;

    const [{ data: profileData }, { data: membershipData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, display_name, status")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("organization_memberships")
        .select("id, user_id, username, role, status, display_name, organization_id, organizations(id, name, code, slug, timezone, status, description)")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

    let resolvedProfile: ProfileContext | null = profileData ? mapProfileRow(profileData) : null;

    if (!resolvedProfile) {
      // A permanent user with no profile row yet (fresh email sign-in or a new
      // Google user) gets an idempotent server bootstrap.
      const bootstrapped = await ensureRegisteredProfile(activeSession.user);
      if (bootstrapped) {
        resolvedProfile = mapProfileRow(bootstrapped);
      }
    }

    setProfile(resolvedProfile);

    const activeMemberships: MembershipContext[] = (membershipData ?? [])
      .map((membership) => {
        const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
        if (!organization || organization.status !== "active") {
          return null;
        }

        return {
          id: membership.id,
          userId: membership.user_id,
          username: membership.username,
          role: membership.role,
          status: membership.status,
          displayName: membership.display_name ?? null,
          organizationId: membership.organization_id,
          organization: {
            id: organization.id,
            code: organization.code,
            slug: organization.slug,
            name: organization.name,
            timezone: organization.timezone,
            description: organization.description ?? null,
          },
        };
      })
      .filter((membership): membership is MembershipContext => membership !== null);

    setMemberships(activeMemberships);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
    bootstrapAttemptedUserIds.current.clear();
  }

  const refreshSessionContext = useEffectEvent(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);

    if (currentSession) {
      await revalidateContext(currentSession);
      return;
    }

    setProfile(null);
    setMemberships([]);
  });

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(currentSession);
      if (currentSession) {
        await revalidateContext(currentSession);
      }
      setLoading(false);
    }

    bootstrap().catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await revalidateContext(nextSession).catch(() => undefined);
      } else {
        setProfile(null);
        setMemberships([]);
        bootstrapAttemptedUserIds.current.clear();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    const changes = [
      { event: "*", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` },
      { event: "*", schema: "public", table: "organization_memberships", filter: `user_id=eq.${session.user.id}` },
    ] satisfies readonly RealtimePostgresChange[];

    const subscription = createRealtimeInvalidationChannel({
      client: supabase,
      channelName: `auth-context-${session.user.id}`,
      changes,
      onInvalidate: () => {
        refreshSessionContext().catch(() => undefined);
      },
    });

    return () => {
      void subscription.remove();
    };
  }, [refreshSessionContext, session?.user.id]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshSessionContext().catch(() => undefined);
      }
    });

    return () => {
      listener.remove();
    };
  }, [refreshSessionContext]);

  // Authoritative guest/registered state comes from the Auth identity
  // (session.user.is_anonymous + confirmed email), never from profiles.email.
  const isGuest = session !== null && isGuestUser(session.user);
  const isRegistered = session !== null && !isGuest;

  const value = useMemo(
    () => ({
      session,
      profile,
      memberships,
      loading,
      isGuest,
      isRegistered,
      refreshSessionContext,
      signOut,
    }),
    [session, profile, memberships, loading, isGuest, isRegistered, refreshSessionContext],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
