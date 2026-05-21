import { expect, test } from "@playwright/test";
import { addSession } from "./helpers";

const routes = [
  ["/dashboard", "Dashboard"],
  ["/dashboard/products", "Productos"],
  ["/dashboard/pos", "POS"],
  ["/dashboard/sales", "Ventas"],
  ["/dashboard/reports", "Reportes"],
  ["/dashboard/imports", "Importaciones"],
  ["/dashboard/settings", "Ajustes"],
] as const;

test("authenticated primary routes render without app crash", async ({ context, page }) => {
  await addSession(context);

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText("Application error")).toHaveCount(0);
  }
});

test("unknown dashboard route renders not found UI", async ({ context, page }) => {
  await addSession(context);
  await page.goto("/dashboard/does-not-exist");
  await expect(page.getByRole("heading", { name: "Seccion no encontrada" })).toBeVisible();
});
