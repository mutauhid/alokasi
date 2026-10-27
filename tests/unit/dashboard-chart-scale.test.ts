import { describe, expect, it } from "vitest";
import {
  buildCashFlowScale,
  scalePosition,
} from "@/components/dashboard-v2/chart-scale";

describe("Dashboard cash-flow scale", () => {
  it("uses an explicit empty state when every value is zero", () => {
    expect(buildCashFlowScale([0n, 0n, 0n])).toBeNull();
  });

  it("builds readable positive ticks without clipping the largest value", () => {
    const scale = buildCashFlowScale([125_000n, 5_850_000n, 900_000n]);

    expect(scale).not.toBeNull();
    expect(scale!.minimum).toBe(0n);
    expect(scale!.maximum).toBeGreaterThanOrEqual(5_850_000n);
    expect(scale!.ticks).toHaveLength(5);
    expect(scalePosition(0n, scale!)).toBe(0);
    expect(scalePosition(scale!.maximum, scale!)).toBe(100);
  });

  it("keeps a visible zero baseline when negative values are present", () => {
    const scale = buildCashFlowScale([-2_500_000n, 1_000_000n]);

    expect(scale).not.toBeNull();
    expect(scale!.minimum).toBe(-scale!.maximum);
    expect(scale!.ticks).toContain(0n);
    expect(scalePosition(0n, scale!)).toBe(50);
    expect(scalePosition(-2_500_000n, scale!)).toBeLessThan(50);
  });

  it("handles values beyond Number safe integer precision using bigint", () => {
    const large = 9_223_372_036_854_000n;
    const scale = buildCashFlowScale([large]);

    expect(scale).not.toBeNull();
    expect(scale!.maximum).toBeGreaterThanOrEqual(large);
    expect(scalePosition(large, scale!)).toBeGreaterThan(0);
    expect(scalePosition(large, scale!)).toBeLessThanOrEqual(100);
  });
});
