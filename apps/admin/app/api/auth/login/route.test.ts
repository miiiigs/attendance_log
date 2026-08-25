import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServerClient = vi.fn();
const createSupabaseServiceClient = vi.fn();

vi.mock("../../../../lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("../../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
}));

function createServerClient(signInError: { message: string } | null = null) {
  const signInWithPassword = vi.fn().mockResolvedValue({ error: signInError });
  return { auth: { signInWithPassword }, signInWithPassword };
}

function createServiceClient(options: {
  matches?: Array<{
    user_id: string;
    status: string;
    organizations: { status: string } | null;
    profiles: { status: string } | null;
  }>;
  authEmail?: string | null;
}) {
  const matches = options.matches ?? [];
  const getUserById = vi.fn().mockResolvedValue(
    options.authEmail
      ? { data: { user: { id: "u-1", email: options.authEmail } }, error: null }
      : { data: { user: null }, error: { message: "not found" } },
  );
  const ilike = vi.fn().mockReturnThis();

  return {
    from: vi.fn((table: string) => {
      if (table === "organization_memberships") {
        return {
          select: vi.fn().mockReturnThis(),
          ilike,
          limit: vi.fn().mockResolvedValue({ data: matches, error: null }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
    auth: { admin: { getUserById } },
    ilike,
    getUserById,
  };
}

const activeMembership = {
  user_id: "u-1",
  status: "active",
  organizations: { status: "active" },
  profiles: { status: "active" },
};

describe("POST /api/auth/login", () => {
  let postRoute: typeof import("./route").POST;

  beforeAll(async () => {
    ({ POST: postRoute } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function post(payload: Record<string, unknown>) {
    return postRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  }

  it("signs in with an email and correct password", async () => {
    const serverClient = createServerClient();
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "admin@example.com", password: "password" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(serverClient.signInWithPassword).toHaveBeenCalledWith({ email: "admin@example.com", password: "password" });
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("signs in with a username by resolving it server-side to the auth email", async () => {
    const serviceClient = createServiceClient({ matches: [activeMembership], authEmail: "admin@example.com" });
    const serverClient = createServerClient();
    createSupabaseServiceClient.mockReturnValue(serviceClient);
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "SCPPA_admin_1", password: "password" });

    expect(response.status).toBe(200);
    expect(serverClient.signInWithPassword).toHaveBeenCalledWith({ email: "admin@example.com", password: "password" });
    expect(serviceClient.getUserById).toHaveBeenCalledWith("u-1");
  });

  it("matches usernames case-insensitively (escapes LIKE wildcards)", async () => {
    const serviceClient = createServiceClient({ matches: [activeMembership], authEmail: "admin@example.com" });
    const serverClient = createServerClient();
    createSupabaseServiceClient.mockReturnValue(serviceClient);
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "scppa_admin_1", password: "password" });

    expect(response.status).toBe(200);
    expect(serviceClient.ilike).toHaveBeenCalledWith("username", "scppa\\_admin\\_1");
  });

  it("returns a generic error for an unknown username", async () => {
    const serviceClient = createServiceClient({ matches: [] });
    const serverClient = createServerClient();
    createSupabaseServiceClient.mockReturnValue(serviceClient);
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "NOPE_admin_1", password: "password" });

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid username/email or password.");
    expect(serverClient.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns a generic error for a wrong password", async () => {
    const serverClient = createServerClient({ message: "Invalid login credentials" });
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "admin@example.com", password: "wrong-password" });

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid username/email or password.");
  });

  it("rejects an ambiguous username without guessing", async () => {
    const serviceClient = createServiceClient({ matches: [activeMembership, { ...activeMembership, user_id: "u-2" }] });
    const serverClient = createServerClient();
    createSupabaseServiceClient.mockReturnValue(serviceClient);
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "SCPPA_admin_1", password: "password" });

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid username/email or password.");
    expect(serverClient.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an inactive membership", async () => {
    const serviceClient = createServiceClient({
      matches: [{ ...activeMembership, status: "inactive" }],
      authEmail: "admin@example.com",
    });
    const serverClient = createServerClient();
    createSupabaseServiceClient.mockReturnValue(serviceClient);
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "SCPPA_admin_1", password: "password" });

    expect(response.status).toBe(401);
    expect(serverClient.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an inactive profile", async () => {
    const serviceClient = createServiceClient({
      matches: [{ ...activeMembership, profiles: { status: "inactive" } }],
      authEmail: "admin@example.com",
    });
    const serverClient = createServerClient();
    createSupabaseServiceClient.mockReturnValue(serviceClient);
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "SCPPA_admin_1", password: "password" });

    expect(response.status).toBe(401);
    expect(serverClient.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects a suspended or archived organization", async () => {
    const serviceClient = createServiceClient({
      matches: [{ ...activeMembership, organizations: { status: "suspended" } }],
      authEmail: "admin@example.com",
    });
    const serverClient = createServerClient();
    createSupabaseServiceClient.mockReturnValue(serviceClient);
    createSupabaseServerClient.mockResolvedValue(serverClient);

    const response = await post({ identifier: "SCPPA_admin_1", password: "password" });

    expect(response.status).toBe(401);
    expect(serverClient.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an empty identifier", async () => {
    const response = await post({ identifier: "   ", password: "password" });

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid username/email or password.");
  });
});
