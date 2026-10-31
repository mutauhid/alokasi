import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function projectSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function componentSource(path: string) {
  return projectSource(`src/components/${path}`);
}

describe("Dashboard V2 presentation contract", () => {
  it("keeps four KPI in a 2x2 mobile and one-row desktop grid", async () => {
    const overview = await componentSource("dashboard-v2/overview.tsx");

    expect(overview).toContain("grid-cols-2");
    expect(overview).toContain("xl:grid-cols-4");
    expect(overview).toContain('title="Arus kas bersih"');
    expect(overview).toContain("dashboard-v2-kpi-amount");
    expect(overview).toContain(
      'className="min-h-8 pr-11 text-[11px] font-medium leading-4',
    );
    expect(overview).not.toContain("sm:min-h-0");
    expect(overview).not.toContain(
      "dashboard-v2-kpi-amount mt-2 block truncate",
    );
  });

  it("keeps period filtering and transaction navigation functional", async () => {
    const [workspace, periodSelect, styles] = await Promise.all([
      componentSource("workspace-page.tsx"),
      componentSource("period-select.tsx"),
      projectSource("src/app/globals.css"),
    ]);

    expect(workspace).toContain('name="periodId"');
    expect(workspace).toContain("<PeriodSelect");
    expect(workspace).toContain("Tampilkan");
    expect(workspace).toContain("Catat transaksi");
    expect(workspace).toContain('sectionHref("transactions"');
    expect(periodSelect).toContain("SelectPrimitive.Content");
    expect(periodSelect).toContain("data-[state=checked]:bg-primary/10");
    expect(styles).toContain(".dashboard-v2-heading-actions");
    expect(styles).toContain(".dashboard-v2-period-form");
    expect(styles).toContain("grid-template-columns: auto minmax(0, 1fr)");
  });

  it("uses the shared custom dropdown contract across forms", async () => {
    const [select, transaction, reports, settings] = await Promise.all([
      componentSource("ui/app-select.tsx"),
      componentSource("transaction-form.tsx"),
      componentSource("report-filter-controls.tsx"),
      componentSource("settings-section.tsx"),
    ]);

    expect(select).toContain("SelectPrimitive.Content");
    expect(select).toContain("name={name}");
    expect(select).toContain("required={required}");
    expect(select).toContain("submitOnChange");
    expect(transaction).toContain("<AppSelect");
    expect(reports).toContain("<AppSelect");
    expect(settings).toContain("<AppSelect");
  });

  it("applies privacy-aware dynamic chart labels and real budget values", async () => {
    const [cashflow, budget] = await Promise.all([
      componentSource("dashboard-v2/cashflow-debt.tsx"),
      componentSource("dashboard-v2/budget-reminders.tsx"),
    ]);

    expect(cashflow).toContain("buildCashFlowScale");
    expect(cashflow).toContain('placeholder="•••"');
    expect(cashflow).toContain("compactRupiah(tick)");
    expect(budget).toContain("budgetPercent(item.actual, item.limitAmount)");
    expect(budget).toContain("rupiah(item.actual)");
    expect(budget).toContain("rupiah(item.limitAmount)");
  });

  it("labels reminder and debt activity states from existing fields", async () => {
    const [overview, activity] = await Promise.all([
      componentSource("dashboard-v2/overview.tsx"),
      componentSource("dashboard-v2/activity.tsx"),
    ]);

    expect(overview).toContain('status === "overdue"');
    expect(overview).toContain("closest.amount");
    expect(activity).toContain('activity.kind === "debt"');
    expect(activity).toContain('activity.activity === "payment"');
  });

  it("keeps every Dashboard drill-down wired to its existing destination", async () => {
    const [overview, cashflow, budget, activity] = await Promise.all([
      componentSource("dashboard-v2/overview.tsx"),
      componentSource("dashboard-v2/cashflow-debt.tsx"),
      componentSource("dashboard-v2/budget-reminders.tsx"),
      componentSource("dashboard-v2/activity.tsx"),
    ]);

    expect(overview).toContain('sectionHref("accounts", workspaceId)');
    expect(cashflow).toContain('linkLabel="Buka laporan"');
    expect(budget).toContain('sectionHref("budgets", workspaceId)');
    expect(budget).toContain("/transactions/reminders?workspaceId=");
    expect(activity).toContain('sectionHref("debts", workspaceId)');
    expect(activity).toContain("reportHref(workspaceId, data.period)");
  });

  it("keeps desktop scrolling subtle and mobile content width stable", async () => {
    const [shell, styles, chart, activity] = await Promise.all([
      componentSource("app-shell.tsx"),
      projectSource("src/app/globals.css"),
      componentSource("dashboard-v2/cashflow-debt.tsx"),
      componentSource("dashboard-v2/activity.tsx"),
    ]);

    expect(shell).toContain("workspace-sidebar-scrollbar");
    expect(styles).toContain("scrollbar-width: thin");
    expect(styles).toContain("scrollbar-gutter: stable");
    expect(chart).toContain('split("–")');
    expect(activity).toContain('className="self-start"');
    expect(activity).toContain("font-semibold text-foreground");
  });
});
