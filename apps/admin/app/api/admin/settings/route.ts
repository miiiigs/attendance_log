import { settingsSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { requireAdminApiContext } from "../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

export async function PATCH(request: Request) {
  const adminContext = await requireAdminApiContext();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = settingsSchema.safeParse(payload);

  if (!parsed.success || typeof payload.id !== "string") {
    return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      organization_name: parsed.data.organizationName,
      timezone: parsed.data.timezone,
      work_start_time: parsed.data.workStartTime,
      work_end_time: parsed.data.workEndTime,
      grace_period_minutes: parsed.data.gracePeriodMinutes,
    })
    .eq("id", payload.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
