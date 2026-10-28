import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function projectSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function componentSource(path: string) {
  return projectSource(`src/components/${path}`);
}

describe("Transactions V2 presentation contract", () => {
  it("keeps transaction data flow and controls connected to existing services", async () => {
    const [section, workspace] = await Promise.all([
      componentSource("transactions-section.tsx"),
      componentSource("workspace-page.tsx"),
    ]);

    expect(section).toContain("listTransactionPage(access.workspaceId");
    expect(section).toContain("TransactionPageSizeControl");
    expect(section).toContain('name="search"');
    expect(section).toContain('name="from"');
    expect(section).toContain('name="to"');
    expect(section).toContain("dateFrom={pagination.dateFrom}");
    expect(section).toContain("SensitiveAmount");
    expect(section).toContain("canMutate");
    expect(section).toContain("key={`edit-${transaction.id}`}");
    expect(section).toContain("key={`delete-${transaction.id}`}");
    expect(workspace).toContain("Periode workspace");
  });

  it("uses a compact local OCR disclosure without changing receipt processing", async () => {
    const [tools, receipt] = await Promise.all([
      componentSource("transaction-tools.tsx"),
      componentSource("receipt-scan-panel.tsx"),
    ]);

    expect(tools).toContain('aria-controls="scan-struk-content"');
    expect(tools).toContain("OCR lokal di browser");
    expect(tools).toContain("defaultOpen");
    expect(tools).toContain("scanDescription");
    expect(receipt).toContain("recognizeReceiptLocally");
    expect(receipt).toContain("image/jpeg,image/png,image/webp");
    expect(receipt).toContain("10 * 1024 * 1024");
  });

  it("keeps create, edit, transfer, validation, and category tiles functional", async () => {
    const [dialog, form] = await Promise.all([
      componentSource("create-transaction-dialog.tsx"),
      componentSource("transaction-form.tsx"),
    ]);

    expect(dialog).toContain("transaction-v2-dialog");
    expect(dialog).toContain("cancelAction");
    expect(form).toContain("createTransactionAction");
    expect(form).toContain("updateTransactionAction");
    expect(form).toContain('value: "transfer"');
    expect(form).toContain("CategoryRadioGroup");
    expect(form).toContain("duplicateConfirmation");
    expect(form).toContain("Tanggal terpilih:");
    expect(form).toContain("calculator");
  });

  it("uses an accessible responsive detail drawer and retains destructive confirmation", async () => {
    const [section, actions, deletion, sheet] = await Promise.all([
      componentSource("transactions-section.tsx"),
      componentSource("transaction-actions.tsx"),
      componentSource("delete-transaction-button.tsx"),
      componentSource("ui/sheet.tsx"),
    ]);

    expect(section).toContain('presentation="drawer"');
    expect(section).toContain("SensitiveAmount");
    expect(actions).toContain('presentation === "drawer"');
    expect(actions).toContain("Kembali ke detail");
    expect(sheet).toContain('side === "responsive"');
    expect(deletion).toContain("Hapus transaksi?");
  });
});
