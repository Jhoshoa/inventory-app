import { expect, test } from "@playwright/test";
import { addSession } from "./helpers";

test("cashier sees only Ventas and Movimientos de stock", async ({ context, page }) => {
  await addSession(context, "cashier");
  await page.goto("/dashboard/reports");

  await expect(page.getByRole("heading", { name: "Reportes", exact: true })).toBeVisible({ timeout: 30_000 });
  const tabs = page.getByRole("navigation", { name: "Secciones de reportes" });
  await expect(tabs.getByRole("link")).toHaveText(["Ventas", "Movimientos de stock"]);

  await page.goto("/dashboard/reports/descargas");
  await expect(page.getByText(/solo del dueño de la tienda/i)).toBeVisible({ timeout: 30_000 });
});

test("owner downloads with the shared range", async ({ context, page }) => {
  await addSession(context, "owner");
  await page.goto("/dashboard/reports/descargas?range=custom&from=2026-06-01&to=2026-06-07");

  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Descargar Productos" })).toHaveAttribute("href", "/api/exports/products", { timeout: 30_000 });
  await expect(main.getByRole("link", { name: "Descargar Movimientos de stock" })).toHaveAttribute(
    "href",
    "/api/exports/stock-movements?from_date=2026-06-01&to_date=2026-06-07",
  );
  await expect(main.getByRole("link", { name: "Descargar Movimientos de caja" })).toHaveAttribute(
    "href",
    "/api/exports/cash-movements?from_date=2026-06-01&to_date=2026-06-07",
  );
});

test("range chip updates the URL and the tabs keep it", async ({ context, page }) => {
  await addSession(context);
  await page.goto("/dashboard/reports");

  await expect(async () => {
    await page.getByRole("button", { name: "7 días" }).click();
    await expect(page).toHaveURL(/range=7d/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Secciones de reportes" }).getByRole("link", { name: "Cierres de caja" })).toHaveAttribute(
    "href",
    /\/dashboard\/reports\/store-days\?range=7d&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/,
  );
});
