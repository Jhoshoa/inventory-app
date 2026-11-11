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
