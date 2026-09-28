import { describe, expect, it } from "vitest";
import {
  csvCell,
  csvDocument,
  resolveReportFilters,
} from "@/modules/reports/domain";

const defaults = { from: "2026-09-01", to: "2026-09-30" };

describe("report filters", () => {
  it("uses explicit inclusive calendar bounds", () => {
    const result = resolveReportFilters(
      {
        from: "2026-09-10",
        to: "2026-09-15",
        type: "expense",
        query: "  makan  ",
      },
      defaults,
    );
    expect(result.valid).toBe(true);
    expect(result.filters).toMatchObject({
      fromValue: "2026-09-10",
      toValue: "2026-09-15",
      type: "expense",
      query: "makan",
      toExclusive: new Date("2026-09-16T00:00:00.000Z"),
    });
  });

  it.each([
    { from: "invalid" },
    { from: "2026-10-01", to: "2026-09-01" },
    { type: "unknown" },
    { accountId: "not-a-uuid" },
  ])("falls back safely for invalid input %#", (input) => {
    const result = resolveReportFilters(input, defaults);
    expect(result.valid).toBe(false);
    expect(result.filters).toMatchObject({
      fromValue: defaults.from,
      toValue: defaults.to,
      type: null,
      accountId: null,
    });
  });
});

describe("CSV safety", () => {
  it.each(["=1+1", "+SUM(A1:A2)", "-2+3", "@command", "  =formula"])(
    "neutralizes spreadsheet formula input %s",
    (value) => expect(csvCell(value)).toBe(`"'${value}"`),
  );

  it("escapes quotes, preserves Indonesian text, and adds a UTF-8 BOM", () => {
    const csv = csvDocument([["Catatan", 'Makan "siang" Rp125.000']]);
    expect(csv).toBe('\uFEFF"Catatan","Makan ""siang"" Rp125.000"\r\n');
  });
});
