import { createContext, useContext, useEffect, useEffectEvent, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { createRealtimeInvalidationChannel, type RealtimePostgresChange } from "@attendance/shared";
import { supabase } from "../lib/supabase/client";

const ORG_CONTEXT_KEY = "activity_log_org_context";

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
}

export interface ProfileContext {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

export interface LoginContextPayload {
  organization: OrganizationContext;
  membership: MembershipContext;
  profile: ProfileContext;
}

interface AuthContextValue {
  session: Session | null;
  profile: ProfileContext | null;
  organization: OrganizationContext | null;
  membership: MembershipContext | null;
  loading: boolean;
  applyLoginContext: (payload: LoginContextPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function serializeLoginContext(payload: LoginContextPayload) {
  return JSON.stringify(payload);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [organization, setOrganization] = useState<OrganizationContext | null>(null);
  const [membership, setMembership] = useState<MembershipContext | null>(null);
  const [loading, setLoading] = useState(true);

  async function applyLoginContext(payload: LoginContextPayload) {
    setProfile(payload.profile);
    setOrganization(payload.organization);
    setMembership(payload.membership);
    await SecureStore.setItemAsync(ORG_CONTEXT_KEY, serializeLoginContext(payload)).catch(() => undefined);
  }

  async function clearSessionContext() {
    setProfile(null);
    setOrganization(null);
    setMembership(null);
    await SecureStore.deleteItemAsync(ORG_CONTEXT_KEY).catch(() => undefined);
  }

  async function revalidateContext(activeSession: Session) {
    const storedRaw = await SecureStore.getItemAsync(ORG_CONTEXT_KEY).catch(() => null);
    let stored: LoginContextPayload | null = null;

    if (storedRaw) {
      try {
        stored = JSON.parse(storedRaw) as LoginContextPayload;
      } catch {
        stored = null;
      }
    }

    const [{ data: profileData }, { data: membershipData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, status")
        .eq("id", activeSession.user.id)
        .maybeSingle(),
      stored?.membership?.id
        ? supabase
            .from("organization_memberships")
            .select("id, user_id, username, role, status, organization_id")
            .eq("id", stored.membership.id)
            .eq("user_id", activeSession.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    setProfile(
      profileData
        ? {
            id: profileData.id,
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            email: profileData.email,
            status: profileData.status,
          }
        : null,
    );

    if (membershipData) {
      const { data: organizationData } = await supabase
        .from("organizations")
        .select("id, name, code, slug, timezone, status")
        .eq("id", membershipData.organization_id)
        .maybeSingle();

      if (organizationData && organizationData.status === "active") {
        setOrganization({
          id: organizationData.id,
          code: organizationData.code,
          slug: organizationData.slug,
          name: organizationData.name,
          timezone: organizationData.timezone,
        });
        setMembership({
          id: membershipData.id,
          userId: membershipData.user_id,
          username: membershipData.username,
          role: membershipData.role,
          status: membershipData.status,
        });
        return;
      }
    }

    await SecureStore.deleteItemAsync(ORG_CONTEXT_KEY).catch(() => undefined);
    setOrganization(null);
    setMembership(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    await clearSessionContext();
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

    await clearSessionContext();
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
        await clearSessionContext();
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
      ...(membership?.id
        ? [{ event: "*", schema: "public", table: "organization_memberships", filter: `id=eq.${membership.id}` } as const]
        : []),
    ] satisfies readonly RealtimePostgresChange[];

    const subscription = createRealtimeInvalidationChannel({
      client: supabase,
      channelName: `auth-context-${session.user.id}-${membership?.id ?? "none"}`,
      changes,
      onInvalidate: () => {
        refreshSessionContext().catch(() => undefined);
      },
    });

    return () => {
      void subscription.remove();
    };
  }, [membership?.id, refreshSessionContext, session?.user.id]);

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

  const value = useMemo(
    () => ({
      session,
      profile,
      organization,
      membership,
      loading,
      applyLoginContext,
      signOut,
    }),
    [loading, membership, organization, profile, session],
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
