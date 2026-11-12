import { expect, test, type BrowserContext } from "@playwright/test";
import { addSession as addRoleSession } from "./helpers";

async function addSession(context: BrowserContext) {
  const session = Buffer.from(
    JSON.stringify({
      id: "user-1",
      email: "owner@example.com",
      store_id: "store-1",
      role: "owner",
    }),
  ).toString("base64url");

  await context.addCookies([
    {
      name: "inventory_session",
      value: session,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("products page renders empty state with session", async ({ context, page }) => {
  await addSession(context);
  await page.goto("/dashboard/products");

  await expect(
    page.getByRole("heading", { name: "Productos", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Agrega tu primer producto")).toBeVisible();
});

test("product filters update the URL", async ({ context, page }) => {
  await addSession(context);
  const productsRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/products" && url.searchParams.get("stock") === "low";
  });
  await page.goto("/dashboard/products");

  await page.getByRole("group", { name: "Stock" }).getByRole("button", { name: /^Stock bajo/ }).click();
  await productsRequest;
  await expect(page).toHaveURL(/\/dashboard\/products\?stock=low$/);
});

test("create product validates required fields", async ({ context, page }) => {
  await addSession(context);
  await page.goto("/dashboard/products/new");

  await page.getByRole("button", { name: "Crear producto" }).click();

  await expect(page.getByText("Nombre es requerido")).toBeVisible();
  await expect(page.getByText("Precio es requerido")).toBeVisible();
});

test.describe("products on the phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("⋯ opens Más acciones and the floating button creates a product", async ({ context, page }) => {
    await addSession(context);
    await page.goto("/dashboard/products");

    await expect(page.getByRole("link", { name: "Nuevo producto" }).last()).toBeVisible();
    await page.getByRole("button", { name: /^Más acciones: importar/ }).click();
    const sheet = page.getByRole("dialog", { name: "Más acciones" });
    await expect(sheet.getByRole("link", { name: /Imprimir etiquetas/ })).toBeVisible();
    await expect(sheet.getByRole("link", { name: /Descargar lista/ })).toBeVisible();
    await sheet.getByRole("button", { name: "Cerrar" }).last().click();
    await expect(sheet).toBeHidden();
  });
});

// Categorías y Lugares en la tienda (tablero P01B). Sin backend, la lista muestra el error con Reintentar.
// 30 s: con `next dev` cada ruta nueva compila la primera vez.
test("the owner reaches Categorías and Lugares from the product tabs", async ({ context, page }) => {
  await addRoleSession(context);
  await page.goto("/dashboard/products");
  const tabs = page.getByRole("navigation", { name: "Secciones de productos" });
  await tabs.getByRole("link", { name: "Categorías" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products\/categorias$/, { timeout: 30_000 });
  await expect(tabs.getByRole("link", { name: "Categorías" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Lugares en la tienda" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products\/lugares$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lugares en la tienda");
});

test("the cashier cannot open Categorías or Lugares", async ({ context, page }) => {
  await addRoleSession(context, "cashier");
  for (const route of ["/dashboard/products/categorias", "/dashboard/products/lugares"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "No tienes permiso" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver a Productos" })).toHaveAttribute("href", "/dashboard/products");
  }
  await page.goto("/dashboard/products");
  await expect(page.getByRole("navigation", { name: "Secciones de productos" })).toHaveCount(0);
});

test.describe("Categorías on the phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Más acciones leads to Categorías and back", async ({ context, page }) => {
    await addRoleSession(context);
    await page.goto("/dashboard/products");
    await page.getByRole("button", { name: /^Más acciones: importar/ }).click();
    await page.getByRole("dialog", { name: "Más acciones" }).getByRole("link", { name: /Categorías/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/products\/categorias$/, { timeout: 15_000 });
    // En el celular el título es la sección (el "Productos" de escritorio está oculto).
    await expect(page.getByRole("heading", { level: 1, name: "Categorías", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Productos", exact: true }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/products$/, { timeout: 15_000 });
  });
});
