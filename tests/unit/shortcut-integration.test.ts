import { describe, expect, it } from "vitest";
import {
  configureShortcutInput,
  detectShortcutReceiptImageType,
  hasShortcutReceiptImageSignature,
  shortcutReceiptRequest,
} from "@/modules/shortcut-integration/domain";
import {
  hashShortcutToken,
  isShortcutTokenShape,
} from "@/modules/shortcut-integration/service";

const uuid = "987c445c-9f1c-4d06-8ee5-1a763cc9ee42";

describe("iPhone Shortcut integration domain", () => {
  it("accepts only bounded OCR text and normalizes it", () => {
    expect(
      shortcutReceiptRequest.parse({ text: "  TOTAL Rp12.500  " }),
    ).toEqual({ text: "TOTAL Rp12.500" });
    expect(shortcutReceiptRequest.safeParse({ text: "  " }).success).toBe(
      false,
    );
    expect(
      shortcutReceiptRequest.safeParse({ text: "x".repeat(50_001) }).success,
    ).toBe(false);
  });

  it("requires workspace account and category identifiers", () => {
    expect(
      configureShortcutInput.safeParse({ accountId: uuid, categoryId: uuid })
        .success,
    ).toBe(true);
    expect(
      configureShortcutInput.safeParse({ accountId: "BCA", categoryId: uuid })
        .success,
    ).toBe(false);
  });

  it("accepts only image bytes matching the declared MIME type", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(hasShortcutReceiptImageSignature(png, "image/png")).toBe(true);
    expect(hasShortcutReceiptImageSignature(png, "image/jpeg")).toBe(false);
    expect(
      detectShortcutReceiptImageType(png, "application/octet-stream"),
    ).toBe("image/png");
    expect(detectShortcutReceiptImageType(png, "image/jpeg")).toBeNull();
    expect(
      hasShortcutReceiptImageSignature(
        new TextEncoder().encode("RIFF0000WEBP"),
        "image/webp",
      ),
    ).toBe(true);
  });

  it("recognizes the scoped token shape and hashes without retaining secret", () => {
    const token = `alokasi_ios_${"a".repeat(43)}`;
    expect(isShortcutTokenShape(token)).toBe(true);
    expect(isShortcutTokenShape("wrong_token")).toBe(false);
    expect(hashShortcutToken(token)).toMatch(/^[0-9a-f]{64}$/u);
    expect(hashShortcutToken(token)).not.toContain(token);
  });
});
