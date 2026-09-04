import { z } from "zod";

export const ACCOUNT_DELETION_SOURCES = ["web", "mobile"] as const;

export const accountDeletionRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(320, "Email address is too long."),
  source: z.enum(ACCOUNT_DELETION_SOURCES).default("web"),
});

export type AccountDeletionRequestInput = z.infer<typeof accountDeletionRequestSchema>;
