import { supabase } from "./supabase/client";

export const reportReasons = [
  { value: "harassment_or_bullying", label: "Harassment or bullying" },
  { value: "hate_or_abuse", label: "Hate or abusive content" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "violence_or_threats", label: "Violence or threats" },
  { value: "spam_or_scam", label: "Spam, scam, or deception" },
  { value: "illegal_or_harmful", label: "Illegal or harmful activity" },
  { value: "privacy_or_personal_information", label: "Private or sensitive information" },
  { value: "intellectual_property", label: "Intellectual-property issue" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof reportReasons)[number]["value"];
export type ReportTarget = "activity" | "organizer";

export function canReportActivity(activityName: string) {
  return activityName !== "Activity unavailable";
}

export function canReportOrganizer(createdBy: string | null | undefined, currentUserId: string | null | undefined) {
  return Boolean(createdBy && currentUserId && createdBy !== currentUserId);
}

export async function submitActivityReport(input: {
  activityId: string;
  target: ReportTarget;
  reason: ReportReason;
  details: string;
}) {
  const { error } = await supabase.rpc("report_activity", {
    target_activity_id: input.activityId,
    report_target: input.target,
    report_reason: input.reason,
    report_details: input.details.trim() || null,
  });

  if (error) {
    throw error;
  }
}

export async function blockActivityOrganizer(activityId: string) {
  const { error } = await supabase.rpc("block_activity_organizer", {
    target_activity_id: activityId,
  });

  if (error) {
    throw error;
  }
}

export async function unblockUser(userId: string) {
  const { error } = await supabase.rpc("unblock_user", {
    target_user_id: userId,
  });

  if (error) {
    throw error;
  }
}
