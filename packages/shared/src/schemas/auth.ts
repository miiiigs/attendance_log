import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Username can only use letters, numbers, dots, underscores, and hyphens.")
  .transform((value) => value.toLowerCase());

export function usernameToAuthEmail(username: string) {
  return `${username.trim().toLowerCase()}@attendance.local`;
}

export const personLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "Enter your 9-digit username."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type PersonLoginInput = z.infer<typeof personLoginSchema>;
