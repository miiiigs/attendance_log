import { createContext, useContext, useEffect, useEffectEvent, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { createRealtimeInvalidationChannel, type RealtimePostgresChange } from "@attendance/shared";
import { supabase } from "../lib/supabase/client";

export interface OrganizationContext {
  id: string;
  code: string;
  slug: string;
  name: string;
  timezone: string;
}

export interface MembershipContext {
  id: string;
  userId: string;
  username: string;
  role: string;
  status: string;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [memberships, setMemberships] = useState<MembershipContext[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select("id, user_id, username, role, status, organization_id, organizations(id, name, code, slug, timezone, status)")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

    setProfile(
      profileData
        ? {
            id: profileData.id,
            firstName: profileData.first_name ?? null,
            lastName: profileData.last_name ?? null,
            displayName: profileData.display_name ?? null,
            email: profileData.email ?? null,
            status: profileData.status,
          }
        : null,
    );

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
          organizationId: membership.organization_id,
          organization: {
            id: organization.id,
            code: organization.code,
            slug: organization.slug,
            name: organization.name,
            timezone: organization.timezone,
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

  const isGuest = Boolean(session) && !profile?.email;
  const isRegistered = Boolean(profile?.email);

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
