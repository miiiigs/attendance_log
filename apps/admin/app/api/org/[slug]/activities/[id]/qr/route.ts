import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../../../lib/org-auth";
import { qrTokenCookieName, qrTokenCookieMaxAge } from "../../../../../../../lib/activity-qr-token";

const DEFAULT_QR_TTL_SECONDS = 18000;

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminContext.supabase;

  const { data: activity } = await supabase
    .from("activities")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", adminContext.organization.id)
    .maybeSingle();

  if (!activity) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  const { data: qrData, error } = await supabase.rpc("create_activity_qr_session", {
    target_activity_id: id,
    ttl_seconds: DEFAULT_QR_TTL_SECONDS,
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to generate a QR." }, { status: 400 });
  }

  const qr = Array.isArray(qrData) ? qrData[0] : qrData;

  const response = NextResponse.json({ ok: true, qr });
  if (qr?.token) {
    response.cookies.set(qrTokenCookieName(id), qr.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: qrTokenCookieMaxAge(),
    });
  }

  return response;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminContext.supabase;

  const { data: session } = await supabase
    .from("qr_sessions")
    .select("id")
    .eq("activity_id", id)
    .eq("organization_id", adminContext.organization.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (session) {
    const { error } = await supabase.rpc("revoke_qr_session", {
      session_id: session.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message ?? "Unable to remove the QR." }, { status: 400 });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(qrTokenCookieName(id), "", { path: "/", maxAge: 0 });
  return response;
}
