import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function projectSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function componentSource(path: string) {
  return projectSource(`src/components/${path}`);
}

describe("Reports V2 presentation contract", () => {
  it("keeps report calculations and CSV connected to the existing services", async () => {
    const [section, service, route] = await Promise.all([
      componentSource("reports-section.tsx"),
      projectSource("src/modules/reports/service.ts"),
      projectSource("src/app/api/reports/transactions.csv/route.ts"),
    ]);

    expect(section).toContain("getReportOverview(workspaceId, today, query)");
    expect(section).toContain("report.netCashFlow");
    expect(section).toContain("report.transfer");
    expect(service).toContain("netCashFlow: income - expense");
    expect(service).toContain('if (transaction.type === "transfer")');
    expect(service).toContain("previousPeriodFilters(context.filters)");
    expect(service).toContain(
      "transactionWhere(workspaceId, comparisonFilters)",
    );
    expect(route).toContain("exportTransactionsCsv(");
    expect(route).toContain('"owner",');
    expect(route).toContain('"editor",');
  });

  it("uses explicit applied filters and an accessible mobile sheet", async () => {
    const [section, filters, sheet] = await Promise.all([
      componentSource("reports-section.tsx"),
      componentSource("report-filter-controls.tsx"),
      componentSource("ui/sheet.tsx"),
    ]);

    expect(section).toContain("activeFilterCount");
    expect(filters).toContain('action="/reports"');
    expect(filters).toContain('method="get"');
    expect(filters).toContain("setDraft(applied)");
    expect(filters).toContain("Tanggal awal tidak boleh melewati");
    expect(filters).toContain('side="bottom"');
    expect(filters).toContain("reports-v2-filter-scroll");
    expect(filters).toContain("ArrowLeftRight");
    expect(filters).toContain("WalletCards");
    expect(filters).toContain("Tags");
    expect(filters).toContain("mobileExportHref");
    expect(filters).toContain("File CSV memuat nominal asli");
    expect(sheet).toContain("SheetPrimitive.Description");
  });

  it("uses privacy-aware dynamic charts and real category proportions", async () => {
    const section = await componentSource("reports-section.tsx");

    expect(section).toContain("buildCashFlowScale");
    expect(section).toContain("scalePosition(");
    expect(section).toContain("SensitiveChartBar");
    expect(section).toContain('placeholder="•••"');
    expect(section).toContain("percentageTenths(");
    expect(section).toContain("report.expense");
    expect(section).toContain("Diagram pengeluaran per kategori");
    expect(section).toContain("report.comparison.income");
    expect(section).toContain("hasSparklineHistory");
    expect(section).toContain("reports-v2-kpi-accent");
    expect(section).toContain('comparisonMode="net"');
    expect(section).toContain("categoryChartBackground");
    expect(section).toContain("conic-gradient");
    expect(section).not.toContain('category.name ?? "Lainnya"');
  });

  it("keeps budget validity and full report data separate from disclosure", async () => {
    const [section, progressive] = await Promise.all([
      componentSource("reports-section.tsx"),
      componentSource("report-progressive-list.tsx"),
    ]);

    expect(section).toContain("!report.isPeriodView");
    expect(section).toContain("budgetPercent(item.actual, item.limitAmount)");
    expect(section).toContain("budgetStatus(item.actual, item.limitAmount)");
    expect(section).toContain("report.budget.items.slice(0, 3)");
    expect(section).toContain(
      "Perbandingan antara rencana dan realisasi budget",
    );
    expect(section).toContain("Lihat semua");
    expect(section).toContain("Ringkasan dan CSV");
    expect(progressive).toContain("items.slice(0, visibleCount)");
    expect(progressive).toContain("Tampilkan lebih ringkas");
    expect(section).toContain("transaksi sudah ditampilkan");
  });

  it("provides a responsive loading state and isolated V2 styling", async () => {
    const [loading, styles] = await Promise.all([
      projectSource("src/app/(workspace)/reports/loading.tsx"),
      projectSource("src/app/globals.css"),
    ]);

    expect(loading).toContain('aria-label="Memuat laporan"');
    expect(loading).toContain("grid-cols-2");
    expect(loading).toContain("xl:grid-cols-4");
    expect(styles).toContain(".reports-v2-card");
    expect(styles).toContain(".reports-v2-filter-scroll");
    expect(styles).toContain(".reports-v2-kpi-amount");
  });
});
