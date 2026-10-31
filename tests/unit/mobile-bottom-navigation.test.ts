import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function componentSource(path: string) {
  return readFile(
    new URL(`../../src/components/${path}`, import.meta.url),
    "utf8",
  );
}

describe("mobile bottom navigation contract", () => {
  it("keeps the five primary slots fixed and workspace scoped", async () => {
    const [navigation, shell] = await Promise.all([
      componentSource("mobile-bottom-navigation.tsx"),
      componentSource("app-shell.tsx"),
    ]);

    expect(navigation).toContain('aria-label="Navigasi mobile"');
    expect(navigation).toContain("fixed inset-x-0 bottom-0");
    expect(navigation).toContain("grid-cols-5");
    expect(navigation).toContain('label="Beranda"');
    expect(navigation).toContain('label="Transaksi"');
    expect(navigation).toContain('label="Budget"');
    expect(navigation).toContain("Lainnya");
    expect(navigation).toContain('sectionHref("dashboard", workspace.id)');
    expect(navigation).toContain('sectionHref("budgets", workspace.id)');
    expect(navigation).toContain("env(safe-area-inset-bottom)");
    expect(shell).toContain("<MobileBottomNavigation");
    expect(shell).toContain("7rem+env(safe-area-inset-bottom)");
  });

  it("opens real scan and manual transaction flows without bypassing permissions", async () => {
    const [navigation, workspace, section, tools] = await Promise.all([
      componentSource("mobile-bottom-navigation.tsx"),
      componentSource("workspace-page.tsx"),
      componentSource("transactions-section.tsx"),
      componentSource("transaction-tools.tsx"),
    ]);

    expect(navigation).toContain('workspace.role !== "viewer"');
    expect(navigation).toContain("&scan=1");
    expect(navigation).toContain("&create=1");
    expect(navigation).toContain("Pencatatan transaksi hanya tersedia");
    expect(workspace).toContain("scan?: string | string[];");
    expect(workspace).toContain('openReceiptScan={query.scan === "1"}');
    expect(section).toContain("Boolean(activeReceiptDraft) || openReceiptScan");
    expect(section).toContain("focusScanOnMount={openReceiptScan}");
    expect(tools).toContain(
      "querySelector<HTMLElement>('input[type=\"file\"]')",
    );
  });

  it("keeps secondary modules and account controls accessible from Lainnya", async () => {
    const navigation = await componentSource("mobile-bottom-navigation.tsx");

    for (const label of [
      "Laporan",
      "Akun",
      "Utang & Piutang",
      "Pengingat",
      "Anggota & akses",
      "Pengaturan",
    ]) {
      expect(navigation).toContain(label);
    }
    expect(navigation).toContain("<AccountMenu");
    expect(navigation).toContain('aria-current={active ? "page" : undefined}');
    expect(navigation).toContain("focus-visible:ring-2");
  });

  it("keeps the mobile workspace and appearance controls aligned", async () => {
    const [shell, switcher, theme] = await Promise.all([
      componentSource("app-shell.tsx"),
      componentSource("workspace-switcher.tsx"),
      componentSource("theme-switcher.tsx"),
    ]);

    expect(shell).toContain("relative z-40 border-b");
    expect(shell).toContain("flex min-h-[52px] items-end gap-2 sm:hidden");
    expect(shell).toContain('aria-label="Buka navigasi"');
    expect(shell).not.toContain('aria-label="Buka pengaturan notifikasi"');
    expect(shell).not.toContain("<ConnectionStatusBadge />");
    expect(shell).toContain("<ThemeSwitcher compact />");
    expect(shell).toMatch(/<WorkspaceSwitcher\s+compact/);
    expect(switcher).toContain('compact ? "flex-1"');
    expect(switcher).toContain("sm:w-[290px]");
    expect(switcher).toContain('"fixed left-4 right-4 top-[4.75rem] w-auto"');
    expect(theme).toContain("<AppSelect");
    expect(theme).toContain('name="theme"');
    expect(theme).toContain("sm:w-[142px]");
    expect(theme).toContain("if (compact)");
    expect(theme).toContain("const CompactIcon = dark ? Moon : Sun");
    expect(theme).toContain('const nextTheme = dark ? "light" : "dark"');
    expect(theme).toContain("onClick={() => changePreference(nextTheme)}");
  });
});
