import { expect, test } from "@playwright/test";
import { addSession, expectBasicA11y } from "./helpers";

test("access pages have basic accessible controls", async ({ page }) => {
  for (const route of ["/login", "/register", "/forgot-password", "/reset-password"]) {
    await page.goto(route);
    await expect(await expectBasicA11y(page)).toEqual([]);
  }
});

test("primary authenticated routes have basic accessible controls", async ({ context, page }) => {
  await addSession(context);

  for (const route of ["/dashboard", "/dashboard/products", "/dashboard/pos", "/dashboard/reports"]) {
    await page.goto(route);
    await expect(await expectBasicA11y(page)).toEqual([]);
  }
});

test("dialogs keep the focus inside, close with Escape and give it back", async ({ context, page }) => {
  await addSession(context);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard/products");

  const trigger = page.getByRole("button", { name: "Importar CSV" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  for (let press = 0; press < 12; press += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("menus mark the current page", async ({ context, page }) => {
  await addSession(context);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard/products");

  await expect(page.locator('[data-nav="sidebar"] [aria-current="page"]')).toHaveText(/Productos/);
});
