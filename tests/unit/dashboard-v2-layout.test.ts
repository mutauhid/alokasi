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
  });

  it("keeps period filtering and transaction navigation functional", async () => {
    const workspace = await componentSource("workspace-page.tsx");

    expect(workspace).toContain('name="periodId"');
    expect(workspace).toContain("Tampilkan");
    expect(workspace).toContain("Catat transaksi");
    expect(workspace).toContain('sectionHref("transactions"');
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
