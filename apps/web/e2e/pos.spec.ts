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

test("pos page renders without app crash", async ({ context, page }) => {
  await addSession(context);

  await page.goto("/dashboard/pos");
  await expect(page.getByRole("heading", { name: "POS" })).toBeVisible();
  await expect(page.getByText("Application error")).toHaveCount(0);
});
