import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function projectSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function componentSource(path: string) {
  return projectSource(`src/components/${path}`);
}

describe("Accounts V2 presentation contract", () => {
  it("keeps account balances and reconciliation connected to existing services", async () => {
    const [section, accountService, reconciliationService] = await Promise.all([
      componentSource("accounts-section.tsx"),
      projectSource("src/modules/accounts/service.ts"),
      projectSource("src/modules/reconciliations/service.ts"),
    ]);

    expect(section).toContain("listAccounts(workspaceId)");
    expect(section).toContain("getAccountReconciliationOverview(");
    expect(section).toContain("total + account.balance");
    expect(accountService).toContain("calculateAccountBalances(");
    expect(accountService).toContain("debtBalanceAdjustments(");
    expect(reconciliationService).toContain("debtAdjustmentsAtDate(");
    expect(reconciliationService).toContain("adjustmentAmount:");
  });

  it("retains existing create, rename, archive, and reconciliation actions", async () => {
    const [panels, archive, reconciliation] = await Promise.all([
      componentSource("account-v2-panels.tsx"),
      componentSource("archive-account-button.tsx"),
      componentSource("reconciliation-form.tsx"),
    ]);

    expect(panels).toContain("createAccountAction");
    expect(panels).toContain("renameAccountAction");
    expect(archive).toContain("archiveAccountAction");
    expect(reconciliation).toContain("createBalanceReconciliationAction");
    expect(reconciliation).toContain('resolution="matched"');
    expect(reconciliation).toContain('resolution="adjusted"');
    expect(reconciliation).toContain("value={resolution}");
    expect(reconciliation).toContain("useFormStatus");
  });

  it("uses responsive dialogs and sheets without replacing navigation", async () => {
    const [panels, reconciliation, shell] = await Promise.all([
      componentSource("account-v2-panels.tsx"),
      componentSource("reconciliation-sheet.tsx"),
      componentSource("app-shell.tsx"),
    ]);

    expect(panels).toContain("DialogPrimitive.Content");
    expect(panels).toContain('side="responsive"');
    expect(reconciliation).toContain('side="responsive"');
    expect(reconciliation).toContain("dateDirty");
    expect(reconciliation).toContain("Tidak ada perubahan saldo sebelum");
    expect(shell).toContain("MobileBottomNavigation");
  });

  it("protects every read-only amount and keeps editable amounts explicit", async () => {
    const [section, panels, reconciliation, form] = await Promise.all([
      componentSource("accounts-section.tsx"),
      componentSource("account-v2-panels.tsx"),
      componentSource("reconciliation-sheet.tsx"),
      componentSource("reconciliation-form.tsx"),
    ]);

    expect(section).toContain("<SensitiveAmount");
    expect(panels).toContain("<SensitiveAmount");
    expect(reconciliation).toContain("<SensitiveAmount");
    expect(form).toContain("<SensitiveAmount");
    expect(panels).toContain("name={name} value={value}");
    expect(form).toContain('name="actualBalance" value={actualBalance}');
    expect(panels).not.toContain("title={account.balanceLabel}");
  });

  it("keeps long balances readable and reconciliation wording unambiguous", async () => {
    const [section, panels, form, styles] = await Promise.all([
      componentSource("accounts-section.tsx"),
      componentSource("account-v2-panels.tsx"),
      componentSource("reconciliation-form.tsx"),
      projectSource("src/app/globals.css"),
    ]);

    expect(section).toContain('label="Belum pernah dicocokkan"');
    expect(section).toContain('"Sudah dicocokkan"');
    expect(section).toContain('"Perlu diperiksa kembali"');
    expect(section).toContain('"Saldo cocok"');
    expect(panels).toContain("accounts-v2-manage-balance");
    expect(panels).toContain("whitespace-nowrap");
    expect(styles).toContain(".accounts-v2-manage-balance");
    expect(form).toContain("Review dampak");
    expect(form).toContain("bukan transaksi dan tidak masuk");
  });

  it("does not expose unsupported account mutations", async () => {
    const [section, panels] = await Promise.all([
      componentSource("accounts-section.tsx"),
      componentSource("account-v2-panels.tsx"),
    ]);

    expect(section).toContain("Akun diarsipkan");
    expect(panels).toContain("Jenis akun tidak dapat diubah");
    expect(section).not.toContain("Pulihkan akun");
    expect(panels).not.toContain("unarchiveAccountAction");
  });
});
