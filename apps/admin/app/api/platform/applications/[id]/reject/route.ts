import { NextResponse } from "next/server";
import { requirePlatformAdminApiContext } from "../../../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await requirePlatformAdminApiContext();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_applications")
    .update({
      status: "rejected",
      reviewed_by: adminContext.profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Only pending applications can be rejected." }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
