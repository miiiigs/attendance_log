import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../lib/org-auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminContext.supabase
    .from("organization_join_authorizations")
    .select("id, normalized_email, status, created_at, claimed_by")
    .eq("organization_id", adminContext.organization.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to load authorized emails." }, { status: 400 });
  }

  return NextResponse.json({ authorizations: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof payload?.email === "string" ? normalizeEmail(payload.email) : "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { error } = await supabase.from("organization_join_authorizations").upsert(
    {
      organization_id: adminContext.organization.id,
      normalized_email: email,
      status: "pending",
      created_by: adminContext.user.id,
    },
    { onConflict: "organization_id,normalized_email" },
  );

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to authorize the email." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email") ?? "";
  const email = normalizeEmail(rawEmail);

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("organization_join_authorizations")
    .delete()
    .eq("organization_id", adminContext.organization.id)
    .eq("normalized_email", email);

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to remove the authorization." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
