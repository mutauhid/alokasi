import { z } from "zod";

export const deleteAccountInput = z.object({
  confirmationEmail: z
    .string()
    .transform((value) => value.trim().toLocaleLowerCase("en-US"))
    .pipe(z.email()),
  password: z.string().min(1).max(256),
});

export const updateProfileInput = z.object({
  displayName: z
    .string()
    .transform((value) => value.normalize("NFC").trim().replace(/\s+/gu, " "))
    .pipe(z.string().min(1).max(100)),
});

export const changePasswordInput = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(8).max(128),
    confirmation: z.string().min(8).max(128),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmation) {
      context.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "Password confirmation does not match.",
      });
    }
    if (value.newPassword === value.currentPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must differ from the current password.",
      });
    }
  });
