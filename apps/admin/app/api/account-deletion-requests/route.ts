import { accountDeletionRequestSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "../../../lib/supabase/service";

const GENERIC_SUCCESS_MESSAGE =
  "If this email is associated with a QRLog account, your deletion request has been recorded. We may contact you to verify ownership before processing it.";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = accountDeletionRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid email address." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("account_deletion_requests").insert({
    normalized_email: parsed.data.email,
    source: parsed.data.source,
  });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "We could not record the request. Please try again later." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
}
