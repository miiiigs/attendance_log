import { z } from "zod";
import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../lib/org-auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

const orgSettingsSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required.").max(160, "Organization name is too long."),
  timezone: z.string().trim().min(2, "Timezone is required.").max(120, "Timezone is too long."),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = orgSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
    })
    .eq("id", adminContext.organization.id);

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to update settings." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
