import { z } from "zod";

function optionalString(maxLength: number, message: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value ?? null;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().max(maxLength, message).nullable().optional(),
  ).transform((value) => value ?? null);
}

export const organizationApplicationSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required.").max(120, "Organization name is too long."),
  contactFirstName: z.string().trim().min(1, "Contact first name is required.").max(80, "First name is too long."),
  contactLastName: z.string().trim().min(1, "Contact last name is required.").max(80, "Last name is too long."),
  contactEmail: z.string().trim().email("Enter a valid contact email."),
  organizationType: optionalString(80, "Organization type is too long."),
  estimatedMemberCount: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }

      if (typeof value === "string") {
        return Number(value);
      }

      return value;
    },
    z
      .number()
      .int("Estimated member count must be a whole number.")
      .min(1, "Estimated member count must be at least 1.")
      .max(1000000, "Estimated member count is too large.")
      .nullable(),
  ),
  message: optionalString(1000, "Message is too long."),
});

export type OrganizationApplicationInput = z.infer<typeof organizationApplicationSchema>;

export const organizationApprovalSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required.").max(120, "Organization name is too long."),
  organizationCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, "Organization code must be 3 to 20 characters using only A-Z, 0-9, or hyphens."),
  timezone: z.string().trim().min(1, "Timezone is required.").max(120, "Timezone is too long."),
  administratorFirstName: z.string().trim().min(1, "Administrator first name is required.").max(80, "First name is too long."),
  administratorLastName: z.string().trim().min(1, "Administrator last name is required.").max(80, "Last name is too long."),
  administratorEmail: z.string().trim().email("Enter a valid administrator email."),
});

export type OrganizationApprovalInput = z.infer<typeof organizationApprovalSchema>;
