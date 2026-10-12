import { z } from "zod";

export const SHORTCUT_RECEIPT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const SHORTCUT_RECEIPT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const SHORTCUT_RECEIPT_REQUEST_MAX_BYTES =
  SHORTCUT_RECEIPT_IMAGE_MAX_BYTES + 100_000;

export type ShortcutReceiptImageType =
  (typeof SHORTCUT_RECEIPT_IMAGE_TYPES)[number];

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

export function isShortcutReceiptImageType(
  value: string,
): value is ShortcutReceiptImageType {
  return SHORTCUT_RECEIPT_IMAGE_TYPES.some((type) => type === value);
}

export function hasShortcutReceiptImageSignature(
  bytes: Uint8Array,
  type: ShortcutReceiptImageType,
) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  }
  return (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

export function detectShortcutReceiptImageType(
  bytes: Uint8Array,
  declaredType: string,
): ShortcutReceiptImageType | null {
  if (isShortcutReceiptImageType(declaredType)) {
    return hasShortcutReceiptImageSignature(bytes, declaredType)
      ? declaredType
      : null;
  }
  if (declaredType && declaredType !== "application/octet-stream") return null;
  return (
    SHORTCUT_RECEIPT_IMAGE_TYPES.find((type) =>
      hasShortcutReceiptImageSignature(bytes, type),
    ) ?? null
  );
}

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
