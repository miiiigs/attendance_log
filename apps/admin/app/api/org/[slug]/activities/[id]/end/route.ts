import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../../../lib/org-auth";
import { qrTokenCookieName } from "../../../../../../../lib/activity-qr-token";

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

  // Fail fast when the activity does not belong to this organization.
  const { data: activity } = await supabase
    .from("activities")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", adminContext.organization.id)
    .maybeSingle();

  if (!activity) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("end_activity", {
    target_activity_id: id,
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to end the activity." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, activity: Array.isArray(data) ? data[0] : data });
  response.cookies.set(qrTokenCookieName(id), "", { path: "/", maxAge: 0 });
  return response;
}
