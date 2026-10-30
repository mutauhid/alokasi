import { describe, expect, it } from "vitest";
import { reportComparisonPresentation } from "@/modules/reports/presentation";

describe("report KPI comparison presentation", () => {
  it("uses a percentage for a representative comparison", () => {
    expect(reportComparisonPresentation(1_125n, 1_000n)).toEqual({
      kind: "percentage",
      delta: 125n,
      percentageTenths: 125n,
    });
  });

  it("does not show an undefined percentage when the previous value is zero", () => {
    expect(reportComparisonPresentation(500n, 0n)).toEqual({
      kind: "new",
      delta: 500n,
    });
    expect(reportComparisonPresentation(0n, 0n)).toEqual({
      kind: "stable",
      delta: 0n,
    });
  });

  it("uses a nominal delta instead of an extreme four-digit percentage", () => {
    expect(reportComparisonPresentation(58_302n, 200n)).toEqual({
      kind: "amount",
      delta: 58_102n,
    });
    expect(reportComparisonPresentation(-19_050n, -100n)).toEqual({
      kind: "amount",
      delta: -18_950n,
    });
  });

  it("describes a net cash flow sign change instead of showing a percentage", () => {
    expect(reportComparisonPresentation(-500n, 250n, "net")).toEqual({
      kind: "sign-change",
      delta: -750n,
      state: "defisit",
    });
    expect(reportComparisonPresentation(500n, -250n, "net")).toEqual({
      kind: "sign-change",
      delta: 750n,
      state: "surplus",
    });
  });
});
