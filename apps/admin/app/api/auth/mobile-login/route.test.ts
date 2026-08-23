import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServiceClient = vi.fn();
const getPublicSupabaseEnv = vi.fn();

vi.mock("../../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
}));

vi.mock("../../../../lib/env", () => ({
  getPublicSupabaseEnv,
}));

const ORG_A = "aaaaaaa1-0000-0000-0000-000000000001";
const ORG_B = "aaaaaaa2-0000-0000-0000-000000000002";

function buildSupabaseMock(overrides?: {
  organizations?: Array<Record<string, unknown>>;
  memberships?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  authUsers?: Array<Record<string, unknown>>;
}) {
  const organizationTable = overrides?.organizations ?? [
    { id: ORG_A, name: "Org A", code: "ORGA", slug: "org-a", timezone: "Asia/Manila", status: "active" },
    { id: ORG_B, name: "Org B", code: "ORGB", slug: "org-b", timezone: "Asia/Manila", status: "suspended" },
  ];
  const membershipTable = overrides?.memberships ?? [
    {
      id: "m-a",
      user_id: "u-1",
      username: "202600001",
      role: "member",
      status: "active",
      organization_id: ORG_A,
    },
    {
      id: "m-b",
      user_id: "u-1",
      username: "202600074",
      role: "member",
      status: "active",
      organization_id: ORG_B,
    },
  ];
  const profileTable = overrides?.profiles ?? [
    { id: "u-1", first_name: "Juan", last_name: "Dela Cruz", email: "juan@example.com", status: "active" },
  ];
  const authUsers = overrides?.authUsers ?? [{ id: "u-1", email: "juan@example.com" }];

  const queryBuilder = (table: string) => {
    const rows: unknown[] = table === "organizations" ? organizationTable : table === "organization_memberships" ? membershipTable : profileTable;
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];

    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      ilike: (column: string, value: unknown) => {
        const pattern = String(value).toLowerCase();
        filters.push((row) => String(row[column] ?? "").toLowerCase() === pattern);
        return builder;
      },
      maybeSingle: async () => {
        const row = rows.find((candidate) => filters.every((filter) => filter(candidate as Record<string, unknown>)));
        return { data: row ?? null, error: null };
      },
    };

    return builder;
  }

  return {
    from: (table: string) => queryBuilder(table),
    auth: {
      admin: {
        getUserById: vi.fn().mockImplementation(async (id: string) => {
          const user = authUsers.find((candidate) => candidate.id === id);
          return { data: user ? { user } : null, error: user ? null : new Error("not found") };
        }),
      },
    },
  };
}

describe("POST /api/auth/mobile-login", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPublicSupabaseEnv.mockReturnValue({ url: "https://supabase.example", anonKey: "anon" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        expires_at: 1234567890,
        token_type: "bearer",
        user: { id: "u-1", email: "juan@example.com" },
      }),
    }) as unknown as typeof fetch;
  });

  async function post(payload: Record<string, unknown>) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://localhost/api/auth/mobile-login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  }

  it("signs in a member with organization code + username + password", async () => {
    createSupabaseServiceClient.mockReturnValue(buildSupabaseMock());

    const response = await post({
      organizationCode: "orga",
      username: "202600001",
      password: "password123",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.access_token).toBe("access-token");
    expect(body.organization).toMatchObject({ id: ORG_A, code: "ORGA", slug: "org-a" });
    expect(body.membership).toMatchObject({ id: "m-a", username: "202600001" });
    expect(body.profile).toMatchObject({ id: "u-1", email: "juan@example.com" });
  });

  it("resolves the correct account when the same user exists in two organizations", async () => {
    createSupabaseServiceClient.mockReturnValue(buildSupabaseMock());

    const response = await post({
      organizationCode: "orga",
      username: "202600001",
      password: "password123",
    });

    const body = await response.json();
    expect(body.organization.id).toBe(ORG_A);
    expect(body.membership.username).toBe("202600001");
    expect(body.membership.userId).toBe("u-1");
  });

  it("rejects an unknown organization with a generic error", async () => {
    createSupabaseServiceClient.mockReturnValue(buildSupabaseMock());

    const response = await post({
      organizationCode: "NOPE",
      username: "202600001",
      password: "password123",
    });

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid organization code, username, or password.");
  });

  it("rejects a suspended organization with an operational message", async () => {
    createSupabaseServiceClient.mockReturnValue(buildSupabaseMock());

    const response = await post({
      organizationCode: "orgb",
      username: "202600074",
      password: "password123",
    });

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("This organization is currently unavailable.");
  });

  it("rejects an inactive membership", async () => {
    const mock = buildSupabaseMock({
      memberships: [
        {
          id: "m-a",
          user_id: "u-1",
          username: "202600001",
          role: "member",
          status: "inactive",
          organization_id: ORG_A,
        },
      ],
    });
    createSupabaseServiceClient.mockReturnValue(mock);

    const response = await post({
      organizationCode: "orga",
      username: "202600001",
      password: "password123",
    });

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("This account is currently inactive.");
  });

  it("rejects a wrong password without revealing account existence", async () => {
    createSupabaseServiceClient.mockReturnValue(buildSupabaseMock());
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid_credentials" }),
    }) as unknown as typeof fetch;

    const response = await post({
      organizationCode: "orga",
      username: "202600001",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid organization code, username, or password.");
  });
});
