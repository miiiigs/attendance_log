/**
 * Builds the admin app for the local E2E with the local Supabase endpoints
 * inlined (NEXT_PUBLIC_* are compile-time). Env values are inherited from the
 * Playwright webServer `env` option. `next start` then serves this build.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["-C", "apps/admin", "build"], {
  cwd: process.cwd(),
  shell: true,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
