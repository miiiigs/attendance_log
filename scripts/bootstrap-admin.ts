import { usernameToAuthEmail } from "@attendance/shared";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.PLATFORM_ADMIN_BOOTSTRAP_USERNAME ?? process.env.ADMIN_BOOTSTRAP_USERNAME ?? "user";
const authEmail = usernameToAuthEmail(username);
const profileEmail = process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL ?? process.env.ADMIN_BOOTSTRAP_EMAIL ?? authEmail;
const password = process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD ?? process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "password";
const firstName = process.env.PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME ?? process.env.ADMIN_BOOTSTRAP_FIRST_NAME ?? "Admin";
const lastName = process.env.PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME ?? process.env.ADMIN_BOOTSTRAP_LAST_NAME ?? "User";
const organizationCode = (process.env.PLATFORM_ADMIN_BOOTSTRAP_ORGANIZATION_CODE ?? "SCPPA").trim().toUpperCase();

if (!url || !serviceRoleKey) {
  throw new Error("Missing Supabase URL or service role key.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const existingUsers = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existingUsers.error) {
    throw existingUsers.error;
  }

  const existingUser = existingUsers.data.users.find((user) => user.email === authEmail);
  let authUser = existingUser ?? null;

  if (authUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        username: username.trim().toLowerCase(),
        contact_email: profileEmail,
      },
    });

    if (error) {
      throw error;
    }

    authUser = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: username.trim().toLowerCase(),
        contact_email: profileEmail,
      },
    });

    if (error) {
      throw error;
    }

    authUser = data.user;
  }

  if (!authUser) {
    throw new Error("Unable to create or find the admin auth user.");
  }

  const legacyProfilePayload = {
    id: authUser.id,
    username: username.trim().toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    email: profileEmail,
    role: "admin",
    status: "active",
  };

  const profilePayload = {
    ...legacyProfilePayload,
    platform_role: "platform_admin",
  };

  const profileUpsert = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileUpsert.error) {
    const fallbackUpsert = await supabase
      .from("profiles")
      .upsert(legacyProfilePayload, { onConflict: "id" });

    if (fallbackUpsert.error) {
      throw fallbackUpsert.error;
    }
  }

  const organizationLookup = await supabase
    .from("organizations")
    .select("id, code")
    .eq("code", organizationCode)
    .maybeSingle();

  if (!organizationLookup.error && organizationLookup.data) {
    const membershipUpsert = await supabase
      .from("organization_memberships")
      .upsert(
        {
          organization_id: organizationLookup.data.id,
          user_id: authUser.id,
          username: username.trim().toLowerCase(),
          role: "organization_admin",
          status: "active",
        },
        { onConflict: "organization_id,user_id" },
      );

    if (membershipUpsert.error) {
      throw membershipUpsert.error;
    }
  } else if (organizationLookup.error && !organizationLookup.error.message.includes("Could not find")) {
    throw organizationLookup.error;
  }

  console.log(`Platform admin bootstrap complete for username "${username}" (${authEmail})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
