import { changePasswordSchema, resetPasswordSchema, type ChangePasswordInput, type ResetPasswordInput } from "../schemas/auth";

type MutationFailure = {
  success: false;
  error: string;
};

type MutationSuccess = {
  success: true;
};

type MutationResult = MutationFailure | MutationSuccess;

export interface ChangePasswordOptions extends ChangePasswordInput {
  email: string;
  verifyPassword: (input: { email: string; password: string }) => Promise<{ error?: string | null }>;
  updatePassword: (input: { password: string }) => Promise<{ error?: string | null }>;
}

export interface ResetPasswordOptions extends ResetPasswordInput {
  updatePassword: (input: { password: string }) => Promise<{ error?: string | null }>;
}

function formatError(message: string | null | undefined, fallback: string) {
  const trimmed = message?.trim();
  return trimmed ? trimmed : fallback;
}

export async function changePasswordWithVerification(options: ChangePasswordOptions): Promise<MutationResult> {
  const parsed = changePasswordSchema.safeParse(options);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Unable to validate the password change request.",
    };
  }

  const verified = await options.verifyPassword({
    email: options.email,
    password: parsed.data.oldPassword,
  });

  if (verified.error) {
    return {
      success: false,
      error: "Your current password is incorrect.",
    };
  }

  const updated = await options.updatePassword({
    password: parsed.data.newPassword,
  });

  if (updated.error) {
    return {
      success: false,
      error: formatError(updated.error, "Unable to update your password."),
    };
  }

  return { success: true };
}

export async function resetPasswordWithSession(options: ResetPasswordOptions): Promise<MutationResult> {
  const parsed = resetPasswordSchema.safeParse(options);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Unable to validate the password reset request.",
    };
  }

  const updated = await options.updatePassword({
    password: parsed.data.newPassword,
  });

  if (updated.error) {
    return {
      success: false,
      error: formatError(updated.error, "Unable to update your password."),
    };
  }

  return { success: true };
}
