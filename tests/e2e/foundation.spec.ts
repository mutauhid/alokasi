import { expect, test } from "@playwright/test";

test("protected pages redirect to an honest auth setup state", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(
    page.getByRole("heading", { name: "Masuk ke Alokasi" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Masuk" })).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("registration and recovery pages are linked and accessible", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Buat akun" }).click();
  await expect(page.getByRole("heading", { name: "Buat akun" })).toBeVisible();
  await expect(page.getByLabel("Nama tampilan")).toHaveAttribute(
    "maxlength",
    "100",
  );
  await expect(page.getByLabel("Password")).toHaveAttribute("minlength", "8");
  await page.getByRole("link", { name: "Sudah punya akun? Masuk" }).click();
  await page.getByRole("link", { name: "Lupa password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Lupa password" }),
  ).toBeVisible();
});

test("auth responses do not reveal whether an email exists", async ({
  page,
}) => {
  await page.goto("/forgot-password?sent=1");
  await expect(
    page.getByText("Jika email dapat digunakan", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("person@example.com");
});

test("auth mutation rejects a cross-origin request", async ({ request }) => {
  const response = await request.post("/auth/sign-in", {
    headers: { Origin: "https://evil.example" },
    form: {
      email: "person@example.com",
      password: "not-a-real-password",
    },
  });
  expect(response.status()).toBe(403);
});

test("unknown routes retain 404 and recovery reaches login", async ({
  page,
}) => {
  const response = await page.goto("/halaman-tidak-ada");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Kembali ke dashboard" }).click();
  await expect(page).toHaveURL(/\/login/);
});
