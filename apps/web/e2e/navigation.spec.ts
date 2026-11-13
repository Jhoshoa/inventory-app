import { expect, test } from "@playwright/test";
import { addSession } from "./helpers";

// Barra de abajo del celular y barra lateral (tablero P00).
test.describe("phone navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("bottom bar marks the current page and Más covers what opens from it", async ({ context, page }) => {
    await addSession(context);
    const tabs = page.locator('[data-nav="tabs"]');

    await page.goto("/dashboard/products");
    await expect(tabs).toBeVisible();
    await expect(page.locator('[data-nav="sidebar"]')).toBeHidden();
    await expect(tabs.getByRole("link", { name: "Productos" })).toHaveAttribute("aria-current", "page");

    await tabs.getByRole("link", { name: /Más/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/mas$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Más", exact: true })).toBeVisible();

    await page.getByRole("link", { name: /Reportes/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/reports$/, { timeout: 15_000 });
    await expect(tabs.getByRole("link", { name: /Más/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Más", exact: true }).first()).toBeVisible();
  });

  test("cashier does not see Configuración in Más", async ({ context, page }) => {
    await addSession(context, "cashier");
    await page.goto("/dashboard/mas");
    await expect(page.getByRole("heading", { name: "Más", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Configuración/ })).toHaveCount(0);
  });

  test("no horizontal scroll on the phone", async ({ context, page }) => {
    await addSession(context);
    for (const route of ["/dashboard", "/dashboard/mas", "/dashboard/caja"]) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, route).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("tablet navigation", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("uses the narrow sidebar", async ({ context, page }) => {
    await addSession(context);
    await page.goto("/dashboard");
    await expect(page.locator('[data-nav="rail"]')).toBeVisible();
    await expect(page.locator('[data-nav="sidebar"]')).toBeHidden();
    await expect(page.locator('[data-nav="tabs"]')).toBeHidden();
  });
});

test.describe("desktop navigation", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("full sidebar with the new names; Vender uses the narrow one", async ({ context, page }) => {
    await addSession(context);
    await page.goto("/dashboard");
    const sidebar = page.locator('[data-nav="sidebar"]');
    await expect(sidebar).toBeVisible();
    for (const name of ["Inicio", "Vender", "Caja", "Productos", "Ventas", "Pedidos", "Reportes", "Configuración"]) {
      await expect(sidebar.getByRole("link", { name, exact: true })).toBeVisible();
    }

    await page.goto("/dashboard/pos");
    await expect(page.locator('[data-nav="rail"]')).toBeVisible();
    await expect(sidebar).toBeHidden();
  });

  test("F2 opens Vender", async ({ context, page }) => {
    await addSession(context);
    await page.goto("/dashboard/sales");
    await expect(page.getByRole("heading", { name: "Ventas", exact: true })).toBeVisible();
    // El atajo existe cuando la página terminó de cargar en el navegador: se reintenta.
    await expect(async () => {
      await page.keyboard.press("F2");
      await expect(page).toHaveURL(/\/dashboard\/pos$/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  });
});
