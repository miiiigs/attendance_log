import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 10;

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
  username: z.string().trim().min(1, "Enter your username.").max(64, "Username is too long."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const emailAddressSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a display name.")
  .max(80, "Display name is too long.");

export const emailSignInSchema = z.object({
  email: emailAddressSchema,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    email: emailAddressSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Your passwords do not match.",
      });
    }
  });

export const joinCommunitySchema = z.object({
  communityCode: z.string().trim().min(1, "Enter a Community code.").max(20, "Community code is too long."),
});

export const forgotPasswordSchema = z.object({
  email: emailAddressSchema,
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "Your new passwords do not match.",
      });
    }

    if (value.oldPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Your new password must be different from your current password.",
      });
    }
  });

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "Your new passwords do not match.",
      });
    }
  });

export type OrganizationLoginInput = z.infer<typeof organizationLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type EmailSignInInput = z.infer<typeof emailSignInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type JoinCommunityInput = z.infer<typeof joinCommunitySchema>;
