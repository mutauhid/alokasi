import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(
    new URL(`../../src/components/${path}`, import.meta.url),
    "utf8",
  );
}

describe("mobile history details", () => {
  it("keeps the Dashboard transaction heading concise", async () => {
    const dashboard = await source("dashboard.tsx");

    expect(dashboard).toContain("Transaksi terbaru periode ini");
    expect(dashboard).toContain("Ringkasan utang & piutang");
    expect(dashboard).toContain("Aktivitas utang & piutang terbaru");
    expect(dashboard).toContain('sectionHref("debts", workspaceId)');
    expect(dashboard).not.toContain(
      "Aktivitas terbaru pada periode yang dipilih",
    );
  });

  it("uses a stable amount column and a tappable transaction detail sheet", async () => {
    const transactions = await source("transactions-section.tsx");

    expect(transactions).toContain("grid-cols-[2.5rem_minmax(0,1fr)_auto]");
    expect(transactions).toContain('heading="Detail transaksi"');
    expect(transactions).toContain("Lihat detail transaksi");
    expect(transactions).toContain("editContent=");
    expect(transactions).toContain("iconOnly");
    expect(transactions).toContain("DeleteTransactionButton");
  });

  it("moves reminder details and actions into the same tappable pattern", async () => {
    const reminders = await source("recurring-transactions-panel.tsx");

    expect(reminders).toContain("grid-cols-[2.5rem_minmax(0,1fr)_auto]");
    expect(reminders).toContain('heading="Detail pengingat"');
    expect(reminders).toContain("Catat sekarang");
    expect(reminders).toContain("ArchiveRecurringTemplateButton");
    expect(reminders).toContain('editLabel="Ubah pengingat"');
    expect(reminders).not.toContain("<details");
  });

  it("keeps edit and delete behind compact accessible actions", async () => {
    const [actions, deletion, archive] = await Promise.all([
      source("transaction-actions.tsx"),
      source("delete-transaction-button.tsx"),
      source("archive-recurring-template-button.tsx"),
    ]);

    expect(actions).toContain('useState<"detail" | "edit">("detail")');
    expect(actions).toContain("aria-label={editLabel}");
    expect(actions).toContain("items-start justify-between");
    expect(actions).toContain("Kembali ke detail");
    expect(deletion).toContain('aria-label={iconOnly ? "Hapus transaksi"');
    expect(archive).toContain("Nonaktifkan pengingat?");
    expect(archive).toContain("Ya, nonaktifkan");
  });
});
