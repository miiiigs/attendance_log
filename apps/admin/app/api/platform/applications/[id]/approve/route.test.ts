import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requirePlatformAdminApiContext = vi.fn();
const createSupabaseServerClient = vi.fn();
const createSupabaseServiceClient = vi.fn();
const sendOnboardingEmail = vi.fn();
const sendExistingMembershipEmail = vi.fn();

vi.mock("../../../../../../lib/auth", () => ({
  requirePlatformAdminApiContext,
}));

vi.mock("../../../../../../lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("../../../../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
}));

vi.mock("../../../../../../lib/server/onboarding-email", () => ({
  sendOnboardingEmail,
  sendExistingMembershipEmail,
}));

function createUserScopedSupabase(options?: {
  applicationStatus?: "pending" | "approved" | "rejected";
  organizationInsertError?: { code?: string; message: string } | null;
  membershipError?: { message: string } | null;
  applicationUpdateConflict?: boolean;
}) {
  const applicationStatus = options?.applicationStatus ?? "pending";
  const organizationInsertError = options?.organizationInsertError ?? null;
  const membershipError = options?.membershipError ?? null;
  const applicationUpdateConflict = options?.applicationUpdateConflict ?? false;

  const organizationApplicationsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "application-1", status: applicationStatus }, error: null }),
    update: vi.fn().mockReturnThis(),
  };

  const organizationsInsertSingle = vi.fn().mockResolvedValue(
    organizationInsertError
      ? { data: null, error: organizationInsertError }
      : {
          data: {
            id: "organization-1",
            name: "North Valley Volunteers",
            code: "NVV",
            slug: "north-valley-volunteers-nvv",
          },
          error: null,
        },
  );

  const organizationsBuilder = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: organizationsInsertSingle,
      })),
    })),
  };

  const organizationMembershipsBuilder = {
    insert: vi.fn().mockResolvedValue({ error: membershipError }),
  };

  const approvedApplicationBuilder = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: applicationUpdateConflict ? null : { id: "application-1" },
      error: null,
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "organization_applications") {
        return organizationApplicationsBuilder;
      }

      if (table === "organizations") {
        return organizationsBuilder;
      }

      if (table === "organization_memberships") {
        return organizationMembershipsBuilder;
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    rpc: vi.fn().mockResolvedValue({ data: "202600001", error: null }),
    approvedApplicationBuilder,
    organizationMembershipsBuilder,
  };
}

function createServiceSupabase(options?: {
  existingProfile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
  } | null;
}) {
  const existingProfile = options?.existingProfile ?? null;
  const profileInsert = vi.fn().mockResolvedValue({ error: null });
  const profileDelete = vi.fn().mockResolvedValue({ error: null });
  const organizationDelete = vi.fn().mockResolvedValue({ error: null });
  const createUser = vi.fn().mockResolvedValue({
    data: { user: { id: "new-user-1" } },
    error: null,
  });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const getUserById = vi.fn().mockResolvedValue({
    data: existingProfile ? { user: { id: existingProfile.id, email: existingProfile.email } } : { user: null },
    error: null,
  });

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existingProfile, error: null }),
          insert: profileInsert,
          delete: vi.fn(() => ({
            eq: profileDelete,
          })),
        };
      }

      if (table === "organizations") {
        return {
          delete: vi.fn(() => ({
            eq: organizationDelete,
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    auth: {
      admin: {
        createUser,
        deleteUser,
        getUserById,
      },
    },
    profileInsert,
    profileDelete,
    organizationDelete,
    createUser,
    deleteUser,
    getUserById,
  };
}

describe("POST /api/platform/applications/[id]/approve", () => {
  let postRoute: typeof import("./route").POST;

  beforeAll(async () => {
    ({ POST: postRoute } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminApiContext.mockResolvedValue({
      profile: { id: "platform-admin-1" },
    });
    sendOnboardingEmail.mockResolvedValue({
      content: {
        recipient: "owner@example.org",
        subject: "Your Activity Log account is ready",
        textBody: "body",
        htmlBody: "<p>body</p>",
        fullEmailText: "To: owner@example.org\n\nbody",
      },
      delivery: { status: "not_configured", reason: "Transactional email is not configured." },
    });
    sendExistingMembershipEmail.mockResolvedValue({
      content: {
        recipient: "owner@example.org",
        subject: "You've been added to North Valley Volunteers",
        textBody: "body",
        htmlBody: "<p>body</p>",
        fullEmailText: "To: owner@example.org\n\nbody",
      },
      delivery: { status: "sent" },
    });
  });

  async function post(payload: Record<string, unknown>) {
    return postRoute(
      new Request("http://localhost/api/platform/applications/application-1/approve", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      {
        params: Promise.resolve({ id: "application-1" }),
      },
    );
  }

  const validPayload = {
    organizationName: "North Valley Volunteers",
    organizationCode: "NVV",
    timezone: "Asia/Manila",
    administratorFirstName: "Mara",
    administratorLastName: "Santos",
    administratorEmail: "OWNER@EXAMPLE.ORG",
  };

  it("rejects unauthorized approval attempts", async () => {
    requirePlatformAdminApiContext.mockResolvedValue(null);

    const response = await post(validPayload);

    expect(response.status).toBe(401);
  });

  it("provisions a new global user and organization admin membership", async () => {
    const userScopedSupabase = createUserScopedSupabase();
    const serviceSupabase = createServiceSupabase();
    createSupabaseServerClient.mockResolvedValue(userScopedSupabase);
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.organization.code).toBe("NVV");
    expect(body.administrator.username).toBe("202600001");
    expect(body.usedExistingAccount).toBe(false);
    expect(typeof body.temporaryPassword).toBe("string");
    expect(sendOnboardingEmail).toHaveBeenCalledOnce();
    expect(serviceSupabase.createUser).toHaveBeenCalledOnce();
    expect(serviceSupabase.profileInsert).toHaveBeenCalledOnce();
    expect(userScopedSupabase.organizationMembershipsBuilder.insert).toHaveBeenCalledWith({
      organization_id: "organization-1",
      user_id: "new-user-1",
      username: "202600001",
      role: "organization_admin",
      status: "active",
    });
  });

  it("reuses an existing global user without resetting the password", async () => {
    const userScopedSupabase = createUserScopedSupabase();
    const serviceSupabase = createServiceSupabase({
      existingProfile: {
        id: "existing-user-1",
        first_name: "Mara",
        last_name: "Santos",
        email: "owner@example.org",
        status: "active",
      },
    });
    createSupabaseServerClient.mockResolvedValue(userScopedSupabase);
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.usedExistingAccount).toBe(true);
    expect(body.temporaryPassword).toBeNull();
    expect(sendExistingMembershipEmail).toHaveBeenCalledOnce();
    expect(serviceSupabase.createUser).not.toHaveBeenCalled();
    expect(serviceSupabase.getUserById).toHaveBeenCalledWith("existing-user-1");
  });

  it("returns a safe conflict when the application is already reviewed", async () => {
    const userScopedSupabase = createUserScopedSupabase({ applicationStatus: "approved" });
    const serviceSupabase = createServiceSupabase();
    createSupabaseServerClient.mockResolvedValue(userScopedSupabase);
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Only pending applications can be approved.");
  });

  it("returns a friendly conflict when the organization code already exists", async () => {
    const userScopedSupabase = createUserScopedSupabase({
      organizationInsertError: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });
    const serviceSupabase = createServiceSupabase();
    createSupabaseServerClient.mockResolvedValue(userScopedSupabase);
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Organization code is already in use.");
  });
});
