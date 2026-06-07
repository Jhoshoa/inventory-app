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
  await expect(page.getByText("Todavia no hay productos")).toBeVisible();
});

test("product filters update the URL", async ({ context, page }) => {
  await addSession(context);
  const productsRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/products" && url.searchParams.get("stock") === "low";
  });
  await page.goto("/dashboard/products");

  await page.getByLabel("Filtro de stock").selectOption("low");
  await productsRequest;
});

test("create product validates required fields", async ({ context, page }) => {
  await addSession(context);
  await page.goto("/dashboard/products/new");

  await page.getByRole("button", { name: "Crear producto" }).click();

  await expect(page.getByText("Nombre es requerido")).toBeVisible();
  await expect(page.getByText("Precio es requerido")).toBeVisible();
});
