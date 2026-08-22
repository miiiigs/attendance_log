import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServerClient = vi.fn();

vi.mock("../../../lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

function buildSupabaseMock(error: { code?: string; message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error });

  return {
    from: vi.fn(() => ({
      insert,
    })),
    insert,
  };
}

describe("POST /api/applications", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function post(payload: Record<string, unknown>) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://localhost/api/applications", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  }

  it("accepts a valid anonymous organization application", async () => {
    const supabase = buildSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await post({
      organizationName: "North Valley Volunteers",
      contactFirstName: "Mara",
      contactLastName: "Santos",
      contactEmail: "mara@example.org",
      organizationType: "Community",
      estimatedMemberCount: "42",
      message: "We need event activity tracking.",
    });

    expect(response.status).toBe(200);
    expect(supabase.insert).toHaveBeenCalledWith({
      organization_name: "North Valley Volunteers",
      contact_first_name: "Mara",
      contact_last_name: "Santos",
      contact_email: "mara@example.org",
      organization_type: "Community",
      estimated_member_count: 42,
      message: "We need event activity tracking.",
    });
  });

  it("rejects invalid application payloads", async () => {
    createSupabaseServerClient.mockResolvedValue(buildSupabaseMock());

    const response = await post({
      organizationName: "   ",
      contactFirstName: "",
      contactLastName: "Santos",
      contactEmail: "not-an-email",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Organization name");
  });

  it("returns a friendly conflict for duplicate pending applications", async () => {
    createSupabaseServerClient.mockResolvedValue(
      buildSupabaseMock({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      }),
    );

    const response = await post({
      organizationName: "North Valley Volunteers",
      contactFirstName: "Mara",
      contactLastName: "Santos",
      contactEmail: "mara@example.org",
      organizationType: "",
      estimatedMemberCount: "",
      message: "",
    });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("A pending application already exists for this organization and contact email.");
  });
});
