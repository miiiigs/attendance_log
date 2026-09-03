import { z } from "zod";
import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../lib/org-auth";
import { qrTokenCookieName, qrTokenCookieMaxAge } from "../../../../../lib/activity-qr-token";

const DEFAULT_QR_TTL_SECONDS = 18000;

const startActivitySchema = z.object({
  name: z.string().trim().min(1, "Activity name is required.").max(200, "Activity name is too long."),
  visibility: z.enum(["community_only", "anyone_with_code"]).default("community_only"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = startActivitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid activity payload." }, { status: 400 });
  }

  const supabase = adminContext.supabase;

  const { data: activity, error: createError } = await supabase.rpc("create_activity", {
    activity_name: parsed.data.name,
    target_organization_id: adminContext.organization.id,
    visibility: parsed.data.visibility,
  });

  if (createError || !activity) {
    return NextResponse.json({ error: createError?.message ?? "Unable to start the activity." }, { status: 400 });
  }

  const activityId = Array.isArray(activity) ? activity[0]?.id : activity?.id;

  if (!activityId) {
    return NextResponse.json({ error: "Activity started but its id could not be resolved." }, { status: 500 });
  }

  const { data: qrData, error: qrError } = await supabase.rpc("create_activity_qr_session", {
    target_activity_id: activityId,
    ttl_seconds: DEFAULT_QR_TTL_SECONDS,
  });

  const qr = Array.isArray(qrData) ? qrData[0] : qrData;

  const response = NextResponse.json({
    ok: true,
    activity: Array.isArray(activity) ? activity[0] : activity,
    qr: qr ?? null,
    qrError: qrError?.message ?? null,
  });

  if (qr?.token) {
    response.cookies.set(qrTokenCookieName(activityId), qr.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: qrTokenCookieMaxAge(),
    });
  }

  return response;
}
