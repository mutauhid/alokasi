import { describe, expect, it } from "vitest";
import {
  anchorDate,
  changeCycleInput,
  periodContaining,
  previewImmediateCycleChange,
} from "../../src/modules/periods/domain";

const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("payday cycle periods", () => {
  it("keeps calendar month behavior for day one", () => {
    const period = periodContaining(new Date("2026-09-24T00:00:00Z"), 1);
    expect([iso(period.start), iso(period.end)]).toEqual([
      "2026-09-01",
      "2026-10-01",
    ]);
  });

  it("places dates around day 25 in adjacent periods", () => {
    expect(
      iso(periodContaining(new Date("2026-09-24T00:00:00Z"), 25).start),
    ).toBe("2026-08-25");
    expect(
      iso(periodContaining(new Date("2026-09-25T00:00:00Z"), 25).start),
    ).toBe("2026-09-25");
  });

  it("recomputes day 31 anchors without February drift", () => {
    expect(iso(anchorDate(2026, 1, 31))).toBe("2026-02-28");
    expect(iso(anchorDate(2026, 2, 31))).toBe("2026-03-31");
    expect(iso(anchorDate(2028, 1, 31))).toBe("2028-02-29");
    expect(iso(anchorDate(2028, 2, 31))).toBe("2028-03-31");
  });

  it("rebases the active period immediately and preserves its earlier prefix", () => {
    const preview = previewImmediateCycleChange(
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-09-27T00:00:00Z"),
      25,
    );
    expect(
      preview.historicalSplit && [
        iso(preview.historicalSplit.start),
        iso(preview.historicalSplit.end),
      ],
    ).toEqual(["2026-09-01", "2026-09-25"]);
    expect([
      iso(preview.active.start),
      iso(preview.active.end),
      preview.active.isTransition,
    ]).toEqual(["2026-09-25", "2026-10-25", false]);
    expect([
      iso(preview.nextRegular.start),
      iso(preview.nextRegular.end),
    ]).toEqual(["2026-10-25", "2026-11-25"]);
  });

  it("shortens the current period when the new anchor is before its start", () => {
    const preview = previewImmediateCycleChange(
      new Date("2026-09-25T00:00:00Z"),
      new Date("2026-09-27T00:00:00Z"),
      1,
    );
    expect(preview.historicalSplit).toBeNull();
    expect([
      iso(preview.active.start),
      iso(preview.active.end),
      preview.active.isTransition,
    ]).toEqual(["2026-09-25", "2026-10-01", true]);
    expect([
      iso(preview.nextRegular.start),
      iso(preview.nextRegular.end),
    ]).toEqual(["2026-10-01", "2026-11-01"]);
  });

  it.each([0, 32, 2.5])("rejects invalid start day %s", (startDay) => {
    expect(
      changeCycleInput.safeParse({
        workspaceId: "4f2bf8be-8b3d-4a78-8a39-8d42be7af783",
        startDay,
        version: 1,
      }).success,
    ).toBe(false);
  });
});
