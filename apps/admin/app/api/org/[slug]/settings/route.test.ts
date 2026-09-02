import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireOrgAdminApiContext = vi.fn();
const createSupabaseServiceClient = vi.fn();

vi.mock("../../../../../lib/org-auth", () => ({
  requireOrgAdminApiContext,
}));

vi.mock("../../../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
}));

function createServiceSupabase() {
  const update = vi.fn().mockReturnThis();
  const eq = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === "organizations") {
        return { update, eq };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
    update,
    eq,
  };
}

describe("PATCH /api/org/[slug]/settings", () => {
  let patchRoute: typeof import("./route").PATCH;

  beforeAll(async () => {
    ({ PATCH: patchRoute } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function patch(body: Record<string, unknown>) {
    return patchRoute(
      new Request("http://localhost/api/org/scppa/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: "scppa" }) },
    );
  }

  it("rejects unauthenticated callers", async () => {
    requireOrgAdminApiContext.mockResolvedValue(null);

    const response = await patch({ name: "South Cotabato Parole and Probation Administration", timezone: "Asia/Manila" });

    expect(response.status).toBe(401);
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload", async () => {
    requireOrgAdminApiContext.mockResolvedValue({ organization: { id: "org-1" } });

    const response = await patch({ name: "", timezone: "" });

    expect(response.status).toBe(400);
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("saves organization settings through the service-role client scoped to the slug organization", async () => {
    const adminContext = {
      organization: { id: "org-1", name: "SCPPA", code: "SCPPA", slug: "scppa", timezone: "Asia/Manila", status: "active" },
    };
    requireOrgAdminApiContext.mockResolvedValue(adminContext);
    const serviceSupabase = createServiceSupabase();
    createSupabaseServiceClient.mockReturnValue(serviceSupabase);

    const response = await patch({
      name: "South Cotabato Parole and Probation Administration",
      timezone: "Asia/Manila",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(createSupabaseServiceClient).toHaveBeenCalledTimes(1);
    expect(serviceSupabase.from).toHaveBeenCalledWith("organizations");
    expect(serviceSupabase.update).toHaveBeenCalledWith({
      name: "South Cotabato Parole and Probation Administration",
      timezone: "Asia/Manila",
    });
    expect(serviceSupabase.eq).toHaveBeenCalledWith("id", "org-1");
  });
});
