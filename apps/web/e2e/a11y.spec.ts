import { expect, test } from "@playwright/test";
import { addSession, expectBasicA11y } from "./helpers";

test("login has basic accessible controls", async ({ page }) => {
  await page.goto("/login");
  await expect(await expectBasicA11y(page)).toEqual([]);
});

test("primary authenticated routes have basic accessible controls", async ({ context, page }) => {
  await addSession(context);

  for (const route of ["/dashboard", "/dashboard/products", "/dashboard/pos", "/dashboard/reports"]) {
    await page.goto(route);
    await expect(await expectBasicA11y(page)).toEqual([]);
  }
});
