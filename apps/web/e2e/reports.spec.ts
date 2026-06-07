import { expect, test } from "@playwright/test";
import { addSession } from "./helpers";

test("cashier sees report page but cannot export", async ({ context, page }) => {
  await addSession(context, "cashier");
  await page.goto("/dashboard/reports");

  await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
  await expect(page.getByText(/requieren rol owner/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Productos" })).toBeDisabled();
});

test("owner sees export links", async ({ context, page }) => {
  await addSession(context, "owner");
  await page.goto("/dashboard/reports");

  const main = page.getByRole("main");

  await expect(main.getByRole("link", { name: "Productos" })).toHaveAttribute(
    "href",
    "/api/exports/products",
  );
  await expect(
    main.getByRole("link", { name: "Movimientos", exact: true }),
  ).toHaveAttribute("href", /\/api\/exports\/stock-movements/);
  await expect(main.getByRole("link", { name: "Caja", exact: true })).toHaveAttribute(
    "href",
    /\/api\/exports\/cash-movements\?from_date=\d{4}-\d{2}-\d{2}&to_date=\d{4}-\d{2}-\d{2}/,
  );
});

test("report date filter updates URL", async ({ context, page }) => {
  await addSession(context);
  await page.goto("/dashboard/reports");

  await page.getByLabel("Rango de reportes").selectOption("7d");
  await expect(page).toHaveURL(/range=7d/);
});
