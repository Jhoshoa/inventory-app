import type { BrowserContext, Page } from "@playwright/test";

export async function addSession(
  context: BrowserContext,
  role: "owner" | "cashier" = "owner",
) {
  const session = Buffer.from(
    JSON.stringify({
      id: "user-1",
      email: `${role}@example.com`,
      store_id: "store-1",
      role,
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

export async function expectBasicA11y(page: Page) {
  const violations = await page.evaluate(() => {
    const issues: string[] = [];

    document.querySelectorAll("button").forEach((button, index) => {
      const name = button.textContent?.trim() || button.getAttribute("aria-label") || button.getAttribute("title");
      if (!name) issues.push(`button:${index}`);
    });

    document.querySelectorAll("input, select, textarea").forEach((field, index) => {
      if (field instanceof HTMLInputElement && field.type === "hidden") return;
      const id = field.getAttribute("id");
      const labelledBy = field.getAttribute("aria-labelledby");
      const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const wrapped = field.closest("label");
      const ariaLabel = field.getAttribute("aria-label");
      if (!label && !wrapped && !ariaLabel && !labelledBy) {
        issues.push(`field:${index}:${field.tagName.toLowerCase()}`);
      }
    });

    return issues;
  });

  return violations;
}
