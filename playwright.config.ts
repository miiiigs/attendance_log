import { defineConfig } from "@playwright/test";
import { e2eEnv } from "./e2e/env";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: e2eEnv.baseURL,
    trace: "retain-on-failure",
    navigationTimeout: 90_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    // The admin app is built with the local Supabase endpoints inlined and
    // then served in production mode (stable chunks; `next dev` on Windows
    // showed flaky 403 chunk loads / broken HMR websockets here).
    command: "node scripts/e2e-build.mjs && pnpm -C apps/admin start",
    url: e2eEnv.baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: e2eEnv.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: e2eEnv.supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: e2eEnv.supabaseServiceRoleKey,
    },
  },
});
