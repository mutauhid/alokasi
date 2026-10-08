import { z } from "zod";

export const configureShortcutInput = z.object({
  accountId: z.uuid(),
  categoryId: z.uuid(),
});

export const shortcutReceiptRequest = z.object({
  text: z
    .string()
    .transform((value) => value.normalize("NFC").trim())
    .pipe(z.string().min(3).max(50_000)),
});

export type ConfigureShortcutInput = z.infer<typeof configureShortcutInput>;

export type ShortcutIntegrationState = {
  configured: boolean;
  accountName?: string;
  categoryName?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  token?: string;
  endpoint?: string;
  error?: string;
  message?: string;
};

export const initialShortcutIntegrationState: ShortcutIntegrationState = {
  configured: false,
};
