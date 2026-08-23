import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Local E2E environment. Values default to the well-known Supabase local
 * stack (127.0.0.1) and can be overridden via E2E_* env vars.
 *
 * These identities and URLs are LOCAL-ONLY. The E2E never touches hosted
 * Supabase, production Auth users, n8n, or real email.
 */

type LocalSupabaseStatus = {
  apiUrl: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
};

function parseEnvOutput(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1);
      accumulator[key] = value;
      return accumulator;
    }, {});
}

function readLocalSupabaseStatus(): LocalSupabaseStatus | null {
  const localHome = resolve(process.cwd(), ".tmp-supabase-home");
  mkdirSync(localHome, { recursive: true });

  const result = spawnSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
    cwd: process.cwd(),
    shell: true,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: localHome,
      USERPROFILE: localHome,
    },
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  const parsed = parseEnvOutput(result.stdout);
  return {
    apiUrl: parsed.API_URL ?? null,
    anonKey: parsed.ANON_KEY ?? null,
    serviceRoleKey: parsed.SERVICE_ROLE_KEY ?? null,
  };
}

function requireLocalSecret(name: string, value: string | null | undefined) {
  if (value?.trim()) {
    return value;
  }

  throw new Error(
    `Missing ${name} for local E2E. Start the local Supabase stack or set ${name} explicitly via the E2E_* environment.`,
  );
}

const localSupabaseStatus = readLocalSupabaseStatus();

export const e2eEnv = {
  baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
  supabaseUrl: process.env.E2E_SUPABASE_URL ?? localSupabaseStatus?.apiUrl ?? "http://127.0.0.1:54321",
  supabaseAnonKey: requireLocalSecret(
    "E2E_SUPABASE_ANON_KEY",
    process.env.E2E_SUPABASE_ANON_KEY ?? localSupabaseStatus?.anonKey,
  ),
  supabaseServiceRoleKey: requireLocalSecret(
    "E2E_SUPABASE_SERVICE_ROLE_KEY",
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? localSupabaseStatus?.serviceRoleKey,
  ),
  supabaseDbUrl: process.env.E2E_SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

export const e2eIdentities = {
  password: "E2ePassword123",
  platformAdmin: {
    username: "e2e.platform",
    email: "e2e.platform@attendance.local",
    firstName: "E2E",
    lastName: "Platform",
  },
  admin: {
    username: "e2e.admin",
    email: "e2e.admin@attendance.local",
    firstName: "E2E",
    lastName: "Admin",
  },
  member: {
    username: "202699001",
    email: "e2e.member@attendance.local",
    firstName: "E2E",
    lastName: "Member",
  },
  memberB: {
    username: "202700001",
    email: "e2e.member-b@attendance.local",
    firstName: "E2E",
    lastName: "MemberB",
  },
};

export const e2eOrgCodes = {
  scppa: "SCPPA",
  orgB: "E2EB",
};

export const e2ePlatformApplication = {
  organizationName: "E2E Community Council",
  organizationCode: "E2EC",
  contactFirstName: "Casey",
  contactLastName: "Owner",
  contactEmail: "e2e.org-admin@example.org",
  organizationType: "Community association",
  estimatedMemberCount: "25",
  message: "Need local activity tracking for recurring events.",
};
