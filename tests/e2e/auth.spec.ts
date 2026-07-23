import { expect, test } from "@playwright/test";
import { createServiceTestClient } from "../helpers/supabase-test-client";
import { COORDINATOR_CREDENTIALS, login } from "./helpers";

const service = createServiceTestClient();

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

test("renueva una sesión válida que está por caducar", async ({ context, page }) => {
  await login(page);

  const authCookies = (await context.cookies())
    .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"))
    .sort((left, right) => left.name.localeCompare(right.name));
  const cookieName = authCookies[0]?.name.replace(/\.\d+$/, "") ?? "";
  const encodedSession = authCookies.map((cookie) => cookie.value).join("");
  const session = JSON.parse(
    Buffer.from(encodedSession.slice("base64-".length), "base64url").toString("utf8")
  ) as {
    expires_at: number;
  };

  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  const expiringSession = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks = expiringSession.match(/.{1,3180}/g) ?? [];

  await context.clearCookies({ name: /^sb-.*-auth-token/ });
  await context.addCookies(
    chunks.map((value, index) => ({
      name: chunks.length === 1 ? cookieName : `${cookieName}.${index}`,
      value,
      domain: authCookies[0]?.domain ?? "127.0.0.1",
      path: "/",
      httpOnly: authCookies[0]?.httpOnly ?? false,
      secure: authCookies[0]?.secure ?? false,
      sameSite: authCookies[0]?.sameSite ?? "Lax"
    }))
  );

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect.poll(async () => {
    const cookies = await context.cookies();
    return cookies.some((cookie) => cookie.name.startsWith(cookieName));
  }).toBe(true);
});

test("limpia una sesión cuyo refresh token fue revocado", async ({ context, page }) => {
  await login(page);

  const authCookies = (await context.cookies())
    .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"))
    .sort((left, right) => left.name.localeCompare(right.name));
  expect(authCookies.length).toBeGreaterThan(0);

  const cookieName = authCookies[0]?.name.replace(/\.\d+$/, "") ?? "";
  const encodedSession = authCookies.map((cookie) => cookie.value).join("");
  expect(encodedSession.startsWith("base64-")).toBe(true);

  const session = JSON.parse(
    Buffer.from(encodedSession.slice("base64-".length), "base64url").toString("utf8")
  ) as {
    access_token: string;
    expires_at: number;
    refresh_token: string;
  };
  const { error: revokeError } = await service.auth.admin.signOut(session.access_token, "global");
  expect(revokeError).toBeNull();

  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  session.refresh_token = "refresh-token-revocado-e2e";
  const invalidSession = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks = invalidSession.match(/.{1,3180}/g) ?? [];

  await context.clearCookies({ name: /^sb-.*-auth-token/ });
  await context.addCookies(
    chunks.map((value, index) => ({
      name: chunks.length === 1 ? cookieName : `${cookieName}.${index}`,
      value,
      domain: authCookies[0]?.domain ?? "127.0.0.1",
      path: "/",
      httpOnly: authCookies[0]?.httpOnly ?? false,
      secure: authCookies[0]?.secure ?? false,
      sameSite: authCookies[0]?.sameSite ?? "Lax"
    }))
  );

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect.poll(async () => {
    const cookies = await context.cookies();
    return cookies.filter((cookie) => cookie.name.startsWith(`${cookieName}`)).length;
  }).toBe(0);
});

test("impide que un coordinador abra la administración de ciclos", async ({ page }) => {
  await login(page, COORDINATOR_CREDENTIALS);
  await page.goto("/ciclos");

  await expect(page).toHaveURL(/\/dashboard$/);
});
