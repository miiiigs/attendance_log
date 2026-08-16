import { usernameToAuthEmail } from "@attendance/shared";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing Supabase URL or service role key.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, email");

  if (profilesError) {
    throw profilesError;
  }

  const users = await listAllUsers();
  const userMap = new Map(users.map((user) => [user.id, user]));

  for (const profile of profiles ?? []) {
    const authUser = userMap.get(profile.id);

    if (!authUser) {
      console.warn(`Skipping ${profile.id}: auth user not found.`);
      continue;
    }

    const nextEmail = usernameToAuthEmail(profile.username);
    if (authUser.email === nextEmail) {
      continue;
    }

    const { error } = await supabase.auth.admin.updateUserById(profile.id, {
      email: nextEmail,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        username: profile.username,
        contact_email: profile.email,
      },
    });

    if (error) {
      throw error;
    }

    console.log(`Updated auth email for ${profile.username} -> ${nextEmail}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
