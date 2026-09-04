import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServiceClient = vi.fn();

vi.mock("../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
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

describe("POST /api/account-deletion-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function post(payload: Record<string, unknown>) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://localhost/api/account-deletion-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  }

  it("accepts a valid email deletion request through the service client", async () => {
    const supabase = buildSupabaseMock();
    createSupabaseServiceClient.mockReturnValue(supabase);

    const response = await post({ email: "  Person@Example.COM  ", source: "web" });

    expect(response.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith("account_deletion_requests");
    expect(supabase.insert).toHaveBeenCalledWith({
      normalized_email: "person@example.com",
      source: "web",
    });
  });

  it("rejects an invalid email without touching Supabase", async () => {
    const response = await post({ email: "not-an-email", source: "web" });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("valid email");
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("returns the same generic success body for duplicate pending requests", async () => {
    createSupabaseServiceClient.mockReturnValue(
      buildSupabaseMock({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      }),
    );

    const response = await post({ email: "person@example.com", source: "mobile" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      message:
        "If this email is associated with a QRLog account, your deletion request has been recorded. We may contact you to verify ownership before processing it.",
    });
  });

  it("does not disclose account existence in successful responses", async () => {
    createSupabaseServiceClient.mockReturnValue(buildSupabaseMock());

    const response = await post({ email: "unknown@example.com" });
    const bodyText = JSON.stringify(await response.json()).toLowerCase();

    expect(response.status).toBe(200);
    expect(bodyText).not.toContain("account found");
    expect(bodyText).not.toContain("no account");
    expect(bodyText).not.toContain("member");
    expect(bodyText).not.toContain("community");
  });
});
