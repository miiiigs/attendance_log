import { createClient } from "@supabase/supabase-js";
import { Client as PgClient } from "pg";
import { e2eEnv, e2eIdentities, e2ePlatformApplication } from "./env";

/**
 * Seeds deterministic local-only E2E identities and resets prior E2E state.
 *
 * Auth users are created through the Supabase Auth admin API (correct
 * password hashing). Because `profiles.id` restricts `auth.users` deletion,
 * profiles and memberships are removed first through a postgres superuser
 * connection before the auth user is deleted. The same connection writes the
 * profiles, memberships, and secondary organization because the local
 * `service_role` role has no table grants by default.
 */
export async function seedE2e() {
  const admin = createClient(e2eEnv.supabaseUrl, e2eEnv.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const pg = new PgClient({ connectionString: e2eEnv.supabaseDbUrl });
  await pg.connect();

  try {
    // Local dev fix: the CLI local stack does not grant service_role table
    // access by default, but the application's server-side service client
    // (login bridge, people onboarding) relies on it. Applied only to the
    // local database by the E2E setup.
    await pg.query("grant usage on schema public to service_role;");
    await pg.query("grant select, insert, update, delete on all tables in schema public to service_role;");
    await pg.query("grant execute on all functions in schema public to service_role;");

    // Resolve the primary E2E organization (dedicated, never the real SCPPA tenant).
    const primaryOrgResult = await pg.query(
      `insert into public.organizations (name, code, slug, status, timezone, approved_at)
       values ('E2E Org A', 'E2EA', 'e2e-a', 'active', 'Asia/Manila', now())
       on conflict (lower(code)) do nothing returning id`,
    );
    const primaryOrgId: string =
      primaryOrgResult.rows[0]?.id ??
      (await pg.query("select id from public.organizations where lower(code) = 'e2ea' limit 1")).rows[0]?.id;
    if (!primaryOrgId) {
      throw new Error("E2E seed: unable to resolve the E2EA organization. Run `pnpm supabase:reset` first.");
    }

    const orgBResult = await pg.query(
      `insert into public.organizations (name, code, slug, status, timezone, approved_at)
       values ('E2E Org B', 'E2EB', 'e2e-b', 'active', 'Asia/Manila', now())
       on conflict (lower(code)) do nothing returning id`,
    );
    const orgBId: string =
      orgBResult.rows[0]?.id ??
      (await pg.query("select id from public.organizations where lower(code) = 'e2eb' limit 1")).rows[0]?.id;
    if (!orgBId) {
      throw new Error("E2E seed: unable to resolve Org B.");
    }

    const platformOrgResult = await pg.query("select id from public.organizations where lower(code) = lower($1) limit 1", [
      e2ePlatformApplication.organizationCode,
    ]);
    const platformOrgId: string | undefined = platformOrgResult.rows[0]?.id;
    if (platformOrgId) {
      await pg.query(`delete from public.qr_sessions where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.activity_scans where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.activity_logs where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.activities where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.attendance_scans where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.attendance_records where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.organization_memberships where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.organization_username_counters where organization_id = $1`, [platformOrgId]);
      await pg.query(`delete from public.organizations where id = $1`, [platformOrgId]);
    }

    await pg.query(
      `delete from public.organization_applications
       where lower(contact_email) = lower($1)
          or lower(organization_name) = lower($2)`,
      [e2ePlatformApplication.contactEmail, e2ePlatformApplication.organizationName],
    );

    // Clear previous E2E activity state in the two E2E organizations only.
    await pg.query(`delete from public.qr_sessions where organization_id in ($1, $2)`, [primaryOrgId, orgBId]);
    await pg.query(`delete from public.activity_scans where organization_id in ($1, $2)`, [primaryOrgId, orgBId]);
    await pg.query(`delete from public.activity_logs where organization_id in ($1, $2)`, [primaryOrgId, orgBId]);
    await pg.query(`delete from public.activities where organization_id in ($1, $2)`, [primaryOrgId, orgBId]);

    // Remove any E2E identities from previous runs: profiles/memberships
    // first (profiles.id restricts auth.users deletion), then the auth user.
    const emails = Object.values(e2eIdentities)
      .filter((identity): identity is (typeof e2eIdentities)["admin"] => typeof identity === "object" && "email" in identity)
      .map((identity) => identity.email);
    emails.push(e2ePlatformApplication.contactEmail);

    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      throw new Error(`E2E seed: unable to list auth users: ${listError.message}`);
    }

    for (const user of existingUsers?.users ?? []) {
      if (!emails.includes(user.email ?? "")) {
        continue;
      }
      await pg.query("delete from public.organization_memberships where user_id = $1", [user.id]);
      await pg.query("delete from public.profiles where id = $1", [user.id]);
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        throw new Error(`E2E seed: unable to delete prior auth user ${user.email}: ${deleteError.message}`);
      }
    }

    // Create fresh auth users.
    const created = new Map<string, { id: string }>();

    for (const [key, identity] of Object.entries(e2eIdentities)) {
      if (key === "password") {
        continue;
      }
      const { data, error } = await admin.auth.admin.createUser({
        email: identity.email,
        password: e2eIdentities.password,
        email_confirm: true,
        user_metadata: { username: identity.username, contact_email: identity.email },
      });
      if (error) {
        throw new Error(`E2E seed: unable to create auth user ${identity.email}: ${error.message}`);
      }
      created.set(key, { id: data.user.id });
    }

    // Insert profiles.
    const profiles = [
      { id: created.get("platformAdmin")!.id, ...e2eIdentities.platformAdmin, role: "person", platformRole: "platform_admin" },
      { id: created.get("admin")!.id, ...e2eIdentities.admin, role: "admin" },
      { id: created.get("member")!.id, ...e2eIdentities.member, role: "person" },
      { id: created.get("memberB")!.id, ...e2eIdentities.memberB, role: "person" },
    ];
    for (const profile of profiles) {
      await pg.query(
        `insert into public.profiles (id, username, first_name, last_name, email, role, status, platform_role)
         values ($1, $2, $3, $4, $5, $6, 'active', $7)`,
        [profile.id, profile.username, profile.firstName, profile.lastName, profile.email, profile.role, profile.platformRole ?? "user"],
      );
    }

    // Insert memberships.
    await pg.query(
      `insert into public.organization_memberships (organization_id, user_id, username, role, status)
       values ($1, $2, $3, 'organization_admin', 'active')`,
      [primaryOrgId, created.get("admin")!.id, e2eIdentities.admin.username],
    );
    await pg.query(
      `insert into public.organization_memberships (organization_id, user_id, username, role, status)
       values ($1, $2, $3, 'member', 'active')`,
      [primaryOrgId, created.get("member")!.id, e2eIdentities.member.username],
    );
    await pg.query(
      `insert into public.organization_memberships (organization_id, user_id, username, role, status)
       values ($1, $2, $3, 'member', 'active')`,
      [orgBId, created.get("memberB")!.id, e2eIdentities.memberB.username],
    );
  } finally {
    await pg.end();
  }
}
