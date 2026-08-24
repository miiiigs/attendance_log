import { describe, expect, it, vi } from "vitest";
import { changePasswordWithVerification, resetPasswordWithSession } from "./account";

describe("account utilities", () => {
  it("rejects mismatched new passwords", async () => {
    const result = await changePasswordWithVerification({
      email: "owner@example.com",
      oldPassword: "current-password",
      newPassword: "next-password-123",
      confirmNewPassword: "different-password",
      verifyPassword: vi.fn(),
      updatePassword: vi.fn(),
    });

    expect(result).toEqual({
      success: false,
      error: "Your new passwords do not match.",
    });
  });

  it("rejects an incorrect old password", async () => {
    const result = await changePasswordWithVerification({
      email: "owner@example.com",
      oldPassword: "wrong-password",
      newPassword: "next-password-123",
      confirmNewPassword: "next-password-123",
      verifyPassword: vi.fn().mockResolvedValue({ error: "Invalid login credentials" }),
      updatePassword: vi.fn(),
    });

    expect(result).toEqual({
      success: false,
      error: "Your current password is incorrect.",
    });
  });

  it("updates the password after verification succeeds", async () => {
    const verifyPassword = vi.fn().mockResolvedValue({ error: null });
    const updatePassword = vi.fn().mockResolvedValue({ error: null });

    const result = await changePasswordWithVerification({
      email: "owner@example.com",
      oldPassword: "current-password",
      newPassword: "next-password-123",
      confirmNewPassword: "next-password-123",
      verifyPassword,
      updatePassword,
    });

    expect(result).toEqual({ success: true });
    expect(verifyPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "current-password",
    });
    expect(updatePassword).toHaveBeenCalledWith({
      password: "next-password-123",
    });
  });

  it("updates the password during a recovery session", async () => {
    const updatePassword = vi.fn().mockResolvedValue({ error: null });

    const result = await resetPasswordWithSession({
      newPassword: "next-password-123",
      confirmNewPassword: "next-password-123",
      updatePassword,
    });

    expect(result).toEqual({ success: true });
    expect(updatePassword).toHaveBeenCalledWith({
      password: "next-password-123",
    });
  });
});
