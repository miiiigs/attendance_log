/**
 * Local E2E environment. Values default to the well-known Supabase local
 * stack (127.0.0.1) and can be overridden via E2E_* env vars.
 *
 * These identities and URLs are LOCAL-ONLY. The E2E never touches hosted
 * Supabase, production Auth users, n8n, or real email.
 */

const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const e2eEnv = {
  baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
  supabaseUrl: process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321",
  supabaseAnonKey: process.env.E2E_SUPABASE_ANON_KEY ?? LOCAL_ANON_KEY,
  supabaseServiceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_SERVICE_ROLE_KEY,
  supabaseDbUrl: process.env.E2E_SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

export const e2eIdentities = {
  password: "E2ePassword123",
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
