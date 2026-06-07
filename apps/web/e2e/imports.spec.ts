import { expect, test } from "@playwright/test";
import { addSession } from "./helpers";

test("imports page renders upload entry point", async ({ context, page }) => {
  await addSession(context);
  await page.goto("/dashboard/imports");

  await expect(page.getByRole("heading", { name: "Import Image" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload image" })).toBeVisible();
});

test("upload photo redirects to import review", async ({ context, page }) => {
  await addSession(context);
  await context.route("**/api/inventory-imports/from-photo", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "import-123",
        status: "needs_review",
        source_filename: "lista.png",
        source_content_type: "image/png",
        source_photo_url: null,
        raw_text: "Arroz 10 5",
        error_message: null,
        items_count: 1,
        items: [],
      }),
    });
  });

  await page.goto("/dashboard/imports");
  await page.getByLabel("Imagen para Import Image").setInputFiles({
    name: "lista.png",
    mimeType: "image/png",
    buffer: Buffer.from("fake-image"),
  });

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/inventory-imports/from-photo") &&
        response.status() === 201,
    ),
    page.getByRole("button", { name: "Procesar imagen" }).click(),
  ]);

  await expect(page).toHaveURL(/\/dashboard\/imports\/import-123$/, { timeout: 15_000 });
});
