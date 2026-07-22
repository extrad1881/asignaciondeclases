import { expect, type Page } from "@playwright/test";

export const ADMIN_CREDENTIALS = {
  email: "admin@local.test",
  password: "Admin123!"
};

export const COORDINATOR_CREDENTIALS = {
  email: "coordinador@local.test",
  password: "Coord123!"
};

export async function login(page: Page, credentials = ADMIN_CREDENTIALS) {
  await page.goto("/login");
  await page.getByLabel("Correo institucional").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Entrar al sistema" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
}
