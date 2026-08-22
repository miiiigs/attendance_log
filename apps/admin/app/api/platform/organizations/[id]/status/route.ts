import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApiContext } from "../../../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase/server";

const organizationStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await requirePlatformAdminApiContext();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = organizationStatusSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status payload." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      status: parsed.data.status,
      approved_by: adminContext.profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, organization: data });
}
