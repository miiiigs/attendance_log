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
  const { error } = await supabase.rpc("platform_hide_activity_report", {
    target_report_id: id,
    moderator_note: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to hide activity." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
