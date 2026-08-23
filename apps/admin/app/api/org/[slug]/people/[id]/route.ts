import { personUpdateSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../../lib/org-auth";
import { createSupabaseServiceClient } from "../../../../../../lib/supabase/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = personUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid person payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // The person must be a member of this organization.
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", adminContext.organization.id)
    .eq("user_id", id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Person not found in this organization." }, { status: 404 });
  }

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
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Account status is organization-scoped: deactivating a member here only
  // affects this organization, not the global identity or other memberships.
  const { error: membershipError } = await supabase
    .from("organization_memberships")
    .update({ status: parsed.data.status })
    .eq("id", membership.id);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
