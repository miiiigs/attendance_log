import { usernameToAuthEmail } from "@attendance/shared";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.ADMIN_BOOTSTRAP_USERNAME ?? "user";
const authEmail = usernameToAuthEmail(username);
const profileEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? authEmail;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "password";
const firstName = process.env.ADMIN_BOOTSTRAP_FIRST_NAME ?? "Admin";
const lastName = process.env.ADMIN_BOOTSTRAP_LAST_NAME ?? "User";

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

  const { error } = await supabase.from("profiles").upsert(
    {
      id: authUser.id,
      username: username.trim().toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      email: profileEmail,
      role: "admin",
      status: "active",
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }

  console.log(`Admin bootstrap complete for username "${username}" (${authEmail})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
