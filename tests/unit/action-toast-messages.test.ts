import { describe, expect, it } from "vitest";
import {
  getActionToastMessage,
  successToastDismissUrl,
} from "@/lib/action-toast-messages";

describe("action success toast messages", () => {
  it("provides clear feedback for core financial actions", () => {
    expect(getActionToastMessage("transaction-created")).toEqual({
      title: "Transaksi berhasil dicatat",
      description: "Saldo, budget, dan ringkasan keuangan sudah diperbarui.",
    });
    expect(getActionToastMessage("budget-created")?.title).toBe(
      "Budget berhasil dibuat",
    );
    expect(getActionToastMessage("receipt-submitted")?.title).toBe(
      "Pengeluaran berhasil dicatat",
    );
  });

  it("covers supporting workspace actions", () => {
    expect(getActionToastMessage("account-created")).toBeDefined();
    expect(getActionToastMessage("category-created")).toBeDefined();
    expect(getActionToastMessage("member-role-changed")).toBeDefined();
    expect(getActionToastMessage("profile-updated")).toBeDefined();
  });

  it("does not present unknown or missing query values as success", () => {
    expect(getActionToastMessage("not-a-real-action")).toBeUndefined();
    expect(getActionToastMessage()).toBeUndefined();
  });

  it("removes only success while preserving workspace, filters, and hash", () => {
    expect(
      successToastDismissUrl(
        "/transactions",
        "?workspaceId=workspace-1&page=2&success=transaction-created",
        "#tambah-transaksi",
      ),
    ).toBe("/transactions?workspaceId=workspace-1&page=2#tambah-transaksi");
    expect(successToastDismissUrl("/budgets", "?success=budget-created")).toBe(
      "/budgets",
    );
  });
});
