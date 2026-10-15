import { expect, test } from "@playwright/test";

test("tema manual tersimpan dan mengabaikan mode perangkat", async ({
  page,
}) => {
  await page.goto("/login");
  const theme = page.getByLabel("Tema tampilan");

  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.locator('meta[name="theme-color"]').first(),
  ).toHaveAttribute("content", "#131b20");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("alokasi-theme")))
    .toBe("dark");

  await page.reload();
  await expect(theme).toHaveValue("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/dark/);

  await theme.selectOption("light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(
    page.locator('meta[name="theme-color"]').first(),
  ).toHaveAttribute("content", "#176b56");
});

test("tema otomatis mengikuti perubahan mode perangkat", async ({ page }) => {
  await page.goto("/login");
  const theme = page.getByLabel("Tema tampilan");

  await theme.selectOption("system");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("alokasi-theme")))
    .toBeNull();
});
