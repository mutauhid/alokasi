import { describe, expect, it } from "vitest";
import { calculateRupiah } from "../../src/lib/rupiah-calculator";
import { MAX_RUPIAH_DIGITS } from "../../src/lib/rupiah-input";

describe("rupiah calculator", () => {
  it.each([
    ["25000", "5000", "add", "30000"],
    ["25000", "5000", "subtract", "20000"],
    ["25000", "3", "multiply", "75000"],
    ["25000", "4", "divide", "6250"],
    ["10", "3", "divide", "3"],
  ] as const)("calculates %s %s %s safely", (left, right, operator, value) => {
    expect(calculateRupiah(left, right, operator)).toEqual({
      value,
      error: null,
    });
  });

  it("rejects division by zero, negative results, and bigint overflow", () => {
    expect(calculateRupiah("10", "0", "divide").error).toMatch(/nol/i);
    expect(calculateRupiah("10", "11", "subtract").error).toMatch(/negatif/i);
    expect(calculateRupiah(MAX_RUPIAH_DIGITS, "1", "add").error).toMatch(
      /batas/i,
    );
  });
});
