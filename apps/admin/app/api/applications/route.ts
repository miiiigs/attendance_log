import { organizationApplicationSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const parsed = organizationApplicationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid application payload." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("organization_applications").insert({
    organization_name: parsed.data.organizationName,
    contact_first_name: parsed.data.contactFirstName,
    contact_last_name: parsed.data.contactLastName,
    contact_email: parsed.data.contactEmail,
    organization_type: parsed.data.organizationType,
    estimated_member_count: parsed.data.estimatedMemberCount,
    message: parsed.data.message,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error: "A pending application already exists for this organization and contact email.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
