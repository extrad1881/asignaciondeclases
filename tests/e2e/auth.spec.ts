import { expect, test } from "@playwright/test";
import { COORDINATOR_CREDENTIALS, login } from "./helpers";

test("redirige a login al abrir una ruta protegida sin sesión", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("Next.js optimiza y entrega el logo institucional", async ({ page, request }) => {
  await page.goto("/login");

  const logo = page.locator('img[alt="Logo institucional"]:visible').first();
  await expect(logo).toBeVisible();
  await expect
    .poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
    .toBe(true);

  const optimizedSource = await logo.getAttribute("src");
  expect(optimizedSource).toContain("/_next/image?");

  const response = await request.get(optimizedSource ?? "");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/^image\//);
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});

test("muestra un error accesible cuando las credenciales son inválidas", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo institucional").fill("usuario-inexistente@local.test");
  await page.getByLabel("Contraseña").fill("CredencialIncorrecta123!");
  await page.getByRole("button", { name: "Entrar al sistema" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "No pudimos iniciar sesión" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("impide que un coordinador abra la administración de ciclos", async ({ page }) => {
  await login(page, COORDINATOR_CREDENTIALS);
  await page.goto("/ciclos");

  await expect(page).toHaveURL(/\/dashboard$/);
});
