import { describe, expect, it } from "vitest";
import {
  formatRupiahInput,
  MAX_RUPIAH_DIGITS,
  normalizeRupiahInput,
} from "@/lib/rupiah-input";

describe("rupiah input", () => {
  it.each([
    ["12000", "12.000"],
    ["2000000", "2.000.000"],
    ["200000", "200.000"],
    ["9", "9"],
  ])("formats %s with Indonesian grouping", (raw, formatted) => {
    expect(formatRupiahInput(raw)).toBe(formatted);
  });

  it.each([
    ["Rp 200.000", "200000"],
    ["Rp2.000.000", "2000000"],
    ["Rp 12.000,00", "12000"],
    ["12,000.00", "12000"],
    ["00012000", "12000"],
    ["", ""],
  ])("normalizes pasted value %s", (input, raw) => {
    expect(normalizeRupiahInput(input)).toBe(raw);
  });

  it("keeps values within the PostgreSQL BIGINT limit", () => {
    expect(normalizeRupiahInput(MAX_RUPIAH_DIGITS)).toBe(MAX_RUPIAH_DIGITS);
    expect(normalizeRupiahInput("9223372036854775808")).toBeNull();
  });
});
