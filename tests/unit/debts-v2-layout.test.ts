import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function projectSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function componentSource(path: string) {
  return projectSource(`src/components/${path}`);
}

describe("Debts and receivables V2 presentation contract", () => {
  it("keeps overview data connected to the existing debt service", async () => {
    const [section, panel] = await Promise.all([
      componentSource("debts-section.tsx"),
      componentSource("debts-panel.tsx"),
    ]);

    expect(section).toContain("getDebtOverview(access.workspaceId, today)");
    expect(section).toContain("overview.totalDebt.toString()");
    expect(section).toContain("overview.totalReceivable.toString()");
    expect(section).toContain("overview.overdueCount");
    expect(panel).toContain("paymentPercentage(item)");
    expect(panel).toContain('item.status === "overdue"');
  });

  it("retains the existing create, partial payment, and settlement actions", async () => {
    const panel = await componentSource("debts-panel.tsx");

    expect(panel).toContain("createDebtRecordAction");
    expect(panel).toContain("createDebtPaymentAction");
    expect(panel).toContain("settleDebtRecordAction");
    expect(panel).toContain("formAction={settleDebtRecordAction}");
    expect(panel).toContain('"Pilih akun pembayaran"');
    expect(panel).toContain('"Pilih akun penerimaan"');
    expect(panel).toContain("mencatat seluruh sisa");
  });

  it("uses responsive accessible sheets and Indonesian financial presentation", async () => {
    const [panel, sheet, loading] = await Promise.all([
      componentSource("debts-panel.tsx"),
      componentSource("ui/sheet.tsx"),
      projectSource("src/app/(workspace)/debts/loading.tsx"),
    ]);

    expect(panel).toContain('side="responsive"');
    expect(panel).toContain('aria-label="Filter jenis catatan"');
    expect(panel).toContain('role="progressbar"');
    expect(panel).toContain("{percentage}%");
    expect(panel).toContain('className="hidden gap-0');
    expect(panel).toContain("sticky top-0 z-10");
    expect(panel).toContain("overscroll-contain");
    expect(panel).toContain('month: "short"');
    expect(sheet).toContain('side === "responsive"');
    expect(loading).toContain('aria-busy="true"');
  });

  it("protects every read-only amount and avoids a duplicated Rupiah prefix", async () => {
    const panel = await componentSource("debts-panel.tsx");

    expect(panel).toContain("useAmountsHidden");
    expect(panel).toContain("<SensitiveAmount");
    expect(panel).toContain('style={{ width: amountsHidden ? "0%"');
    expect(panel).toContain("placeholder={amount(selected.outstandingAmount)}");
    expect(panel).not.toContain(
      "placeholder={rupiah(selected.outstandingAmount)}",
    );
  });
});
