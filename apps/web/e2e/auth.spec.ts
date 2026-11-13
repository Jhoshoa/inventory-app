import { expect, test } from "@playwright/test";
import { addSession } from "./helpers";

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("mocked session reaches dashboard and products", async ({ context, page }) => {
  await addSession(context);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();

  const productsLink = page.locator('[data-nav="sidebar"]').getByRole("link", { name: "Productos", exact: true });

  await expect(productsLink).toHaveAttribute("href", "/dashboard/products");
  await productsLink.click();
  await expect(page).toHaveURL(/\/dashboard\/products$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Productos", exact: true }),
  ).toBeVisible();
});

test("login validates before calling the server and shows 401 / 429 in words", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/auth/login", async (route) => {
    calls += 1;
    await route.fulfill({ status: calls === 1 ? 401 : 429, json: { message: "nope" } });
  });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entra a tu tienda" })).toBeVisible();

  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Escribe tu correo")).toBeVisible();
  expect(calls).toBe(0);

  await page.getByLabel("Correo electrónico").fill("rosa@correo.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();

  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Demasiados intentos. Espera unos minutos y vuelve a intentar.")).toBeVisible();
});

test("cashier lands on Vender when the register is open", async ({ context, page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({ json: { user: { role: "cashier" } } }));
  await page.route("**/api/store-day/current", (route) => route.fulfill({ json: { status: "open" } }));
  await page.goto("/login");
  // La API real deja las cookies al entrar; aquí se agregan antes de enviar.
  await addSession(context, "cashier");

  await page.getByLabel("Correo electrónico").fill("cashier@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard\/pos$/, { timeout: 15_000 });
});

test("register enables the button only when the password meets every rule", async ({ page }) => {
  await page.goto("/register");
  const submit = page.getByRole("button", { name: "Crear mi tienda" });
  await expect(submit).toBeDisabled();

  await page.getByLabel("Contraseña", { exact: true }).fill("clave");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave123!");
  await expect(submit).toBeEnabled();
});

test("forgot password shows the same notice whether or not the account exists", async ({ page }) => {
  await page.route("**/api/auth/forgot-password", (route) => route.fulfill({ json: { message: "ok" } }));
  await page.goto("/forgot-password");
  await expect(page.getByRole("link", { name: "Volver a entrar" })).toHaveAttribute("href", "/login");

  await page.getByLabel("Correo electrónico").fill("nadie@correo.com");
  await page.getByRole("button", { name: "Enviar enlace" }).click();

  await expect(page.getByText(/Si ese correo tiene una cuenta, te llegó un enlace/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Enviar otro en \d+ s/ })).toBeDisabled();
});

test("reset password without a valid link offers a new one", async ({ page }) => {
  await page.goto("/reset-password");

  await expect(page.getByText("Este enlace ya no sirve.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/forgot-password");
});
