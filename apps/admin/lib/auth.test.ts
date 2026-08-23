import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

const createSupabaseServerClient = vi.fn();

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient,
}));

function buildSupabaseMock(input: {
  user?: { id: string } | null;
  getUserError?: Error | null;
  profile?: Record<string, unknown> | null;
}) {
  const profile = input.profile ?? null;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: input.user ?? null },
        error: input.getUserError ?? null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
    })),
  };
}

describe("platform auth guards", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("allows an active platform admin via validated user lookup", async () => {
    const supabase = buildSupabaseMock({
      user: { id: "platform-user" },
      profile: {
        id: "platform-user",
        first_name: "Platform",
        last_name: "Admin",
        role: "person",
        status: "active",
        platform_role: "platform_admin",
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase);

    const { requirePlatformAdmin } = await import("./auth");
    const result = await requirePlatformAdmin();

    expect(result.user.id).toBe("platform-user");
    expect(supabase.auth.getUser).toHaveBeenCalledOnce();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("denies organization admins from platform routes", async () => {
    const supabase = buildSupabaseMock({
      user: { id: "org-admin" },
      profile: {
        id: "org-admin",
        first_name: "Org",
        last_name: "Admin",
        role: "person",
        status: "active",
        platform_role: "user",
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase);

    const { requirePlatformAdmin } = await import("./auth");

    await expect(requirePlatformAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("denies anonymous users", async () => {
    const supabase = buildSupabaseMock({ user: null });
    createSupabaseServerClient.mockResolvedValue(supabase);

    const { requirePlatformAdmin } = await import("./auth");

    await expect(requirePlatformAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("fails safely when the session cannot be validated", async () => {
    const supabase = buildSupabaseMock({
      user: null,
      getUserError: new Error("invalid session"),
    });
    createSupabaseServerClient.mockResolvedValue(supabase);

    const { requirePlatformAdminApiContext } = await import("./auth");
    const result = await requirePlatformAdminApiContext();

    expect(result).toBeNull();
    expect(supabase.auth.getUser).toHaveBeenCalledOnce();
  });
});
