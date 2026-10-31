import { expect, test, type Page } from "@playwright/test";

async function chooseTheme(
  page: Page,
  option: "Otomatis" | "Terang" | "Gelap",
) {
  await page.getByRole("combobox", { name: "Tema tampilan" }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("tema manual tersimpan dan mengabaikan mode perangkat", async ({
  page,
}) => {
  await page.goto("/login");
  const theme = page.getByLabel("Tema tampilan");

  await chooseTheme(page, "Gelap");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.locator('meta[name="theme-color"]').first(),
  ).toHaveAttribute("content", "#131b20");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("alokasi-theme")))
    .toBe("dark");

  await page.reload();
  await expect(theme).toContainText("Gelap");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/dark/);

  await chooseTheme(page, "Terang");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(
    page.locator('meta[name="theme-color"]').first(),
  ).toHaveAttribute("content", "#176b56");
});

test("tema otomatis mengikuti perubahan mode perangkat", async ({ page }) => {
  await page.goto("/login");

  await chooseTheme(page, "Otomatis");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("alokasi-theme")))
    .toBeNull();
});
