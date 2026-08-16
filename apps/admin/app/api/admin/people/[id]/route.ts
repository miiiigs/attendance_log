import { personUpdateSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { requireAdminApiContext } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await requireAdminApiContext();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = personUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid person payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    email: parsed.data.email,
    email_confirm: true,
    user_metadata: {
      contact_email: parsed.data.email,
    },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email,
      status: parsed.data.status,
    })
    .eq("id", id)
    .eq("role", "person");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
