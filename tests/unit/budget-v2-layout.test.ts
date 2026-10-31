import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function projectSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function componentSource(path: string) {
  return projectSource(`src/components/${path}`);
}

describe("Budget V2 presentation contract", () => {
  it("keeps financial data connected to the existing overview and domain rules", async () => {
    const section = await componentSource("budgets-section.tsx");

    expect(section).toContain("getBudgetOverview(workspaceId, today, periodId");
    expect(section).toContain("budgetPercent(");
    expect(section).toContain("budgetStatus(");
    expect(section).toContain("overview.unbudgeted");
    expect(section).toContain("overview.remaining");
    expect(section).toContain("percent > 100n ? 100n : percent");
    expect(section).toContain("SensitiveAmount");
    expect(section).toContain("Status: {totalStatus}");
    expect(section).toContain("budget-v2-kpi-featured");
  });

  it("uses the existing server actions for create, copy, edit, and delete", async () => {
    const [createDialog, copySheet, section, deletion] = await Promise.all([
      componentSource("create-budget-dialog.tsx"),
      componentSource("copy-budgets-sheet.tsx"),
      componentSource("budgets-section.tsx"),
      componentSource("delete-budget-button.tsx"),
    ]);

    expect(createDialog).toContain("createBudgetAction");
    expect(copySheet).toContain("copyBudgetsAction");
    expect(section).toContain("updateBudgetAction");
    expect(deletion).toContain("deleteBudgetAction");
    expect(deletion).toContain("Hapus budget?");
  });

  it("uses accessible responsive modal and drawer patterns", async () => {
    const [createDialog, copySheet, section, loading] = await Promise.all([
      componentSource("create-budget-dialog.tsx"),
      componentSource("copy-budgets-sheet.tsx"),
      componentSource("budgets-section.tsx"),
      projectSource("src/app/(workspace)/budgets/loading.tsx"),
    ]);

    expect(createDialog).toContain("DialogPrimitive.Description");
    expect(createDialog).toContain('aria-label="Tutup dialog buat budget"');
    expect(copySheet).toContain('side="responsive"');
    expect(copySheet).toContain("selectedIds.length");
    expect(copySheet).toContain("Tidak ada kategori yang dapat disalin");
    expect(copySheet).toContain("noEligibleItems");
    expect(section).toContain('presentation="drawer"');
    expect(section).toContain('className="size-11 rounded-xl"');
    expect(section).toContain("key={`edit-${item.id}`}");
    expect(section).toContain("key={`delete-${item.id}`}");
    expect(loading).toContain('aria-busy="true"');
  });

  it("keeps active and historical budget permissions explicit", async () => {
    const section = await componentSource("budgets-section.tsx");

    expect(section).toContain("canManage && overview.isActivePeriod");
    expect(section).toContain("Mode riwayat bersifat baca saja");
    expect(section).toContain(
      "Pembuatan atau perubahan budget dikelola oleh Owner",
    );
    expect(section).toContain('name="periodId"');
    expect(section).toContain("<PeriodSelect");
  });

  it("keeps read-only amounts private while leaving create and edit inputs usable", async () => {
    const [section, copySheet, createDialog] = await Promise.all([
      componentSource("budgets-section.tsx"),
      componentSource("copy-budgets-sheet.tsx"),
      componentSource("create-budget-dialog.tsx"),
    ]);

    expect(section).toContain("<SensitiveAmount>");
    expect(copySheet).toContain("<SensitiveAmount");
    expect(createDialog).toContain("RupiahInput");
    expect(createDialog).toContain('aria-label="Form buat budget"');
    expect(createDialog).toContain("LoaderCircle");
  });
});
