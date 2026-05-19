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
      name: "inventory_access_token",
      value: "test-token",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "inventory_session",
      value: session,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("pos search adds products to the cart and respects stock", async ({ context, page }) => {
  await addSession(context);
  await page.route("**/api/products/pos**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "product-1",
            name: "Arroz 1kg",
            price: "12.50",
            stock: 1,
            unit: "unidad",
            qr_code: "QR-1",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    });
  });

  await page.goto("/dashboard/pos");
  await expect(page.getByRole("heading", { name: "POS" })).toBeVisible();

  await page.getByPlaceholder("Buscar por nombre o QR").fill("arroz");
  await expect(page.getByText("Arroz 1kg")).toBeVisible();
  await page.getByRole("button", { name: "Agregar" }).click();

  await expect(page.getByText("1 productos")).toBeVisible();
  await expect(page.getByText(/Bs.*12,50/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Aumentar cantidad" })).toBeDisabled();
});
