import { expect, test } from "@playwright/test";
import { addSession } from "./helpers";

const routes = [
  ["/dashboard", "Inicio"],
  ["/dashboard/products", "Productos"],
  ["/dashboard/pos", "Vender"],
  ["/dashboard/caja", "Caja y jornada"],
  ["/dashboard/sales", "Ventas"],
  ["/dashboard/solicitudes", "Pedidos"],
  ["/dashboard/reports", "Reportes"],
  ["/dashboard/settings", "Configuración"],
  ["/dashboard/mas", "Más"],
] as const;

test("authenticated primary routes render without app crash", async ({ context, page }) => {
  // Nueve rutas en un solo test: con `next dev` cada una compila la primera vez y 30 s no alcanzan.
  test.setTimeout(120_000);
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
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir a Inicio" })).toHaveAttribute("href", "/dashboard");
});
