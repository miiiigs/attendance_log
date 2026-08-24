import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requirePlatformAdminApiContext = vi.fn();
const createSupabaseServerClient = vi.fn();
const createSupabaseServiceClient = vi.fn();
const generateTemporaryPassword = vi.fn();
const sendAdminOnboardingEmail = vi.fn();
const sendExistingAdminEmail = vi.fn();
const sendAdminPromotionEmail = vi.fn();

vi.mock("../../../../../../lib/auth", () => ({
  requirePlatformAdminApiContext,
}));

vi.mock("../../../../../../lib/passwords", () => ({
  generateTemporaryPassword,
}));

vi.mock("../../../../../../lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("../../../../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
}));

vi.mock("../../../../../../lib/server/onboarding-email", () => ({
  sendAdminOnboardingEmail,
  sendExistingAdminEmail,
  sendAdminPromotionEmail,
}));

interface MembershipRow {
  id: string;
  user_id: string;
  username: string;
  role: string;
  status: string;
}

interface ServiceOptions {
  organization?: {
    id: string;
    name: string;
    code: string;
    slug: string;
    status: string;
  } | null;
  existingProfile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
  } | null;
  existingMembership?: MembershipRow | null;
  profileInsertError?: { message: string } | null;
  membershipInsertError?: { message: string } | null;
}

function createUserScopedSupabase() {
  return {
    rpc: vi.fn().mockResolvedValue({ data: "202600003", error: null }),
  };
}

function createServiceSupabase(options: ServiceOptions = {}) {
  const organization = options.organization === undefined
    ? { id: "org-1", name: "SCPPA", code: "SCPPA", slug: "scppa", status: "active" }
    : options.organization;
  const existingProfile = options.existingProfile ?? null;
  const existingMembership = options.existingMembership ?? null;

  const profileInsert = vi.fn().mockResolvedValue({ error: options.profileInsertError ?? null });
  const profileDelete = vi.fn().mockResolvedValue({ error: null });
  const membershipInsert = vi.fn().mockResolvedValue({ error: options.membershipInsertError ?? null });
  const membershipUpdateMaybeSingle = vi.fn().mockResolvedValue({
    data: { id: "membership-1", username: "202600001", role: "organization_admin", status: "active" },
    error: null,
  });
  const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: organization, error: null }),
        };
      }

      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existingProfile, error: null }),
          insert: profileInsert,
          delete: vi.fn(() => ({ eq: profileDelete })),
        };
      }

      if (table === "organization_memberships") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existingMembership, error: null }),
          insert: membershipInsert,
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: membershipUpdateMaybeSingle,
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    auth: {
      admin: {
        createUser,
        deleteUser,
      },
    },
    profileInsert,
    profileDelete,
    membershipInsert,
    membershipUpdateMaybeSingle,
    createUser,
    deleteUser,
  };
}

describe("POST /api/platform/organizations/[id]/admins", () => {
  let postRoute: typeof import("./route").POST;

  beforeAll(async () => {
    ({ POST: postRoute } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminApiContext.mockResolvedValue({ profile: { id: "platform-admin-1" } });
    generateTemporaryPassword.mockReturnValue("TEMP_PASSWORD_FOR_TESTS");
    sendAdminOnboardingEmail.mockResolvedValue({
      content: {
        recipient: "admin@example.org",
        subject: "Your QRLog administrator account is ready",
        textBody: "body",
        htmlBody: "<p>body</p>",
        fullEmailText: "To: admin@example.org\n\nbody",
      },
      delivery: { status: "sent" },
    });
    sendExistingAdminEmail.mockResolvedValue({
      content: {
        recipient: "admin@example.org",
        subject: "You've been added as an administrator to SCPPA",
        textBody: "body",
        htmlBody: "<p>body</p>",
        fullEmailText: "To: admin@example.org\n\nbody",
      },
      delivery: { status: "sent" },
    });
    sendAdminPromotionEmail.mockResolvedValue({
      content: {
        recipient: "admin@example.org",
        subject: "You now have administrator access to SCPPA",
        textBody: "body",
        htmlBody: "<p>body</p>",
        fullEmailText: "To: admin@example.org\n\nbody",
      },
      delivery: { status: "sent" },
    });
  });

  async function post(payload: Record<string, unknown>) {
    return postRoute(
      new Request("http://localhost/api/platform/organizations/org-1/admins", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      {
        params: Promise.resolve({ id: "org-1" }),
      },
    );
  }

  const validPayload = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "JUAN@EXAMPLE.ORG",
  };

  it("rejects unauthorized callers (including ordinary org admins)", async () => {
    requirePlatformAdminApiContext.mockResolvedValue(null);

    const response = await post(validPayload);

    expect(response.status).toBe(401);
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload", async () => {
    const serviceSupabase = createServiceSupabase();
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());

    const response = await post({ firstName: "", lastName: "", email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(serviceSupabase.createUser).not.toHaveBeenCalled();
  });

  it("rejects a nonexistent organization", async () => {
    const serviceSupabase = createServiceSupabase({ organization: null });
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());

    const response = await post(validPayload);

    expect(response.status).toBe(404);
  });

  it("rejects a suspended or archived organization", async () => {
    const serviceSupabase = createServiceSupabase({
      organization: { id: "org-1", name: "SCPPA", code: "SCPPA", slug: "scppa", status: "suspended" },
    });
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());

    const response = await post(validPayload);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Only active organizations can have administrators assigned.");
  });

  it("creates a new global user as organization administrator", async () => {
    const userScopedSupabase = createUserScopedSupabase();
    const serviceSupabase = createServiceSupabase();
    createSupabaseServerClient.mockResolvedValue(userScopedSupabase);
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("created");
    expect(body.administrator.email).toBe("juan@example.org");
    expect(body.administrator.username).toBe("202600003");
    expect(body.temporaryPassword).toBeNull();
    expect(userScopedSupabase.rpc).toHaveBeenCalledWith("generate_next_membership_username", {
      target_organization_id: "org-1",
    });
    expect(serviceSupabase.createUser).toHaveBeenCalledOnce();
    expect(serviceSupabase.profileInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "person", status: "active" }),
    );
    expect(serviceSupabase.membershipInsert).toHaveBeenCalledWith({
      organization_id: "org-1",
      user_id: "new-user-1",
      username: "202600003",
      role: "organization_admin",
      status: "active",
    });
    expect(sendAdminOnboardingEmail).toHaveBeenCalledOnce();
  });

  it("exposes the temporary password only when email delivery fails", async () => {
    sendAdminOnboardingEmail.mockResolvedValue({
      content: {
        recipient: "juan@example.org",
        subject: "Your QRLog administrator account is ready",
        textBody: "body",
        htmlBody: "<p>body</p>",
        fullEmailText: "To: juan@example.org\n\nbody",
      },
      delivery: { status: "not_configured", reason: "Transactional email is not configured." },
    });
    const serviceSupabase = createServiceSupabase();
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.temporaryPassword).toBe("TEMP_PASSWORD_FOR_TESTS");
  });

  it("rolls back a newly created auth user when profile creation fails", async () => {
    const serviceSupabase = createServiceSupabase({
      profileInsertError: { message: "profile insert failed" },
    });
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);

    expect(response.status).toBe(400);
    expect(serviceSupabase.createUser).toHaveBeenCalledOnce();
    expect(serviceSupabase.deleteUser).toHaveBeenCalledWith("new-user-1");
    expect(serviceSupabase.membershipInsert).not.toHaveBeenCalled();
  });

  it("reuses an existing global user without resetting the password", async () => {
    const serviceSupabase = createServiceSupabase({
      existingProfile: {
        id: "existing-user-1",
        first_name: "Juan",
        last_name: "Dela Cruz",
        email: "juan@example.org",
        status: "active",
      },
      existingMembership: null,
    });
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("added");
    expect(body.administrator.userId).toBe("existing-user-1");
    expect(body.temporaryPassword).toBeNull();
    expect(serviceSupabase.createUser).not.toHaveBeenCalled();
    expect(serviceSupabase.membershipInsert).toHaveBeenCalledWith({
      organization_id: "org-1",
      user_id: "existing-user-1",
      username: "202600003",
      role: "organization_admin",
      status: "active",
    });
    expect(sendExistingAdminEmail).toHaveBeenCalledOnce();
    expect(sendAdminOnboardingEmail).not.toHaveBeenCalled();
  });

  it("promotes an existing member without changing membership id or username", async () => {
    const serviceSupabase = createServiceSupabase({
      existingProfile: {
        id: "existing-user-1",
        first_name: "Juan",
        last_name: "Dela Cruz",
        email: "juan@example.org",
        status: "active",
      },
      existingMembership: {
        id: "membership-1",
        user_id: "existing-user-1",
        username: "202600001",
        role: "member",
        status: "active",
      },
    });
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("promoted");
    expect(body.administrator.username).toBe("202600001");
    expect(body.temporaryPassword).toBeNull();
    expect(serviceSupabase.createUser).not.toHaveBeenCalled();
    expect(serviceSupabase.membershipInsert).not.toHaveBeenCalled();
    expect(serviceSupabase.membershipUpdateMaybeSingle).toHaveBeenCalledOnce();
    expect(sendAdminPromotionEmail).toHaveBeenCalledOnce();
    expect(sendAdminOnboardingEmail).not.toHaveBeenCalled();
  });

  it("returns a safe conflict for an existing organization administrator", async () => {
    const serviceSupabase = createServiceSupabase({
      existingProfile: {
        id: "existing-user-1",
        first_name: "Juan",
        last_name: "Dela Cruz",
        email: "juan@example.org",
        status: "active",
      },
      existingMembership: {
        id: "membership-1",
        user_id: "existing-user-1",
        username: "202600001",
        role: "organization_admin",
        status: "active",
      },
    });
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("This person is already an organization administrator.");
    expect(serviceSupabase.membershipUpdateMaybeSingle).not.toHaveBeenCalled();
  });

  it("rejects an inactive existing account", async () => {
    const serviceSupabase = createServiceSupabase({
      existingProfile: {
        id: "existing-user-1",
        first_name: "Juan",
        last_name: "Dela Cruz",
        email: "juan@example.org",
        status: "inactive",
      },
    });
    createSupabaseServerClient.mockResolvedValue(createUserScopedSupabase());
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await post(validPayload);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("The existing QRLog account for this email is inactive.");
  });
});
