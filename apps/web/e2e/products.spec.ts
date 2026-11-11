import { expect, test, type BrowserContext } from "@playwright/test";

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
