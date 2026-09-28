import { describe, expect, it } from "vitest";
import {
  changePasswordInput,
  deleteAccountInput,
  updateProfileInput,
} from "../../src/modules/users/domain";

describe("account deletion input", () => {
  it("normalizes the confirmation email and keeps the password opaque", () => {
    expect(
      deleteAccountInput.parse({
        confirmationEmail: "  USER@Example.COM ",
        password: "  exact password  ",
      }),
    ).toEqual({
      confirmationEmail: "user@example.com",
      password: "  exact password  ",
    });
  });

  it("rejects missing credentials", () => {
    expect(
      deleteAccountInput.safeParse({
        confirmationEmail: "invalid",
        password: "",
      }).success,
    ).toBe(false);
  });

  it("normalizes a display name without changing its meaning", () => {
    expect(
      updateProfileInput.parse({ displayName: "  Taufik   Hidayat " }),
    ).toEqual({ displayName: "Taufik Hidayat" });
  });

  it("requires a different matching password with at least eight characters", () => {
    expect(
      changePasswordInput.safeParse({
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmation: "new-password",
      }).success,
    ).toBe(true);
    expect(
      changePasswordInput.safeParse({
        currentPassword: "same-password",
        newPassword: "same-password",
        confirmation: "different-password",
      }).success,
    ).toBe(false);
  });
});
