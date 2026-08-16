import { DEFAULT_TIMEZONE } from "@attendance/shared";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiContext } from "../../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

const requestSchema = z.object({
  action: z.enum(["time_out", "revert_time_out"]).default("time_out"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."),
  mode: z.enum(["all", "selected"]),
  userIds: z.array(z.string().min(1)).optional(),
});

function getTodayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  try {
    const context = await requireAdminApiContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request payload." }, { status: 400 });
    }

    if (
      (parsed.data.mode === "selected" || parsed.data.action === "revert_time_out") &&
      (!parsed.data.userIds || !parsed.data.userIds.length)
    ) {
      return NextResponse.json(
        {
          error:
            parsed.data.action === "revert_time_out"
              ? "Select at least one user to revert."
              : "Select at least one user to time out.",
        },
        { status: 400 },
      );
    }

    const today = getTodayInManila();
    if (parsed.data.date !== today) {
      return NextResponse.json(
        { error: `Manual attendance actions are only available for today's Daily Logs (${today}).` },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const rpcName = parsed.data.action === "revert_time_out" ? "admin_revert_time_out" : "admin_force_time_out";
    const { data, error } = await supabase.rpc(rpcName, {
      target_date: parsed.data.date,
      target_user_ids:
        parsed.data.mode === "selected" || parsed.data.action === "revert_time_out"
          ? parsed.data.userIds ?? []
          : null,
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message ??
            (parsed.data.action === "revert_time_out"
              ? "Unable to revert time-outs."
              : "Unable to time out users."),
        },
        { status: 400 },
      );
    }

    const updates = Array.isArray(data) ? data : [];
    const updatedCount = updates.length;

    return NextResponse.json({
      success: true,
      updatedCount,
      message: updatedCount
        ? parsed.data.action === "revert_time_out"
          ? `Reverted ${updatedCount} time-out${updatedCount === 1 ? "" : "s"} successfully.`
          : `Timed out ${updatedCount} user${updatedCount === 1 ? "" : "s"} successfully.`
        : parsed.data.action === "revert_time_out"
          ? "No matching completed time-outs were found."
          : "No matching timed-in users were found.",
    });
  } catch (reason) {
    return NextResponse.json(
      {
        error: reason instanceof Error && reason.message ? reason.message : "Unexpected attendance action error.",
      },
      { status: 500 },
    );
  }
}
