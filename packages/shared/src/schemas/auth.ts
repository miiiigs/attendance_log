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

export const organizationLoginSchema = z.object({
  organizationCode: z
    .string()
    .trim()
    .min(1, "Enter your organization code.")
    .max(20, "Organization code is too long.")
    .transform((value) => value.toUpperCase()),
  username: z.string().trim().min(1, "Enter your username.").max(32, "Username is too long."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type OrganizationLoginInput = z.infer<typeof organizationLoginSchema>;
