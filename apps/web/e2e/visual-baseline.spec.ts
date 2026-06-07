import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { addSession } from "./helpers";
import { startVisualMockBackend } from "./visual-fixtures";

const evidenceDir = path.resolve(
  process.cwd(),
  "test-results/visual-baseline",
);

const routes = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/dashboard/pos", name: "pos" },
  { path: "/dashboard/products", name: "products" },
  { path: "/dashboard/products/labels", name: "product-labels" },
  { path: "/dashboard/sales", name: "sales" },
  { path: "/dashboard/reports", name: "reports" },
  { path: "/dashboard/settings", name: "settings" },
] as const;

const viewports = [
  { width: 375, height: 812, name: "mobile-375" },
  { width: 430, height: 932, name: "mobile-430" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 1024, height: 768, name: "tablet-landscape-1024" },
  { width: 1440, height: 900, name: "desktop-1440" },
] as const;

test.describe("Sprint 1 visual baseline", () => {
  let mockBackend: Awaited<ReturnType<typeof startVisualMockBackend>>;

  test.beforeAll(async () => {
    mkdirSync(evidenceDir, { recursive: true });
    mockBackend = await startVisualMockBackend();
  });

  test.afterAll(async () => {
    await mockBackend.close();
  });

  for (const viewport of viewports) {
    test.describe(`${viewport.name} ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const route of routes) {
        test(`${route.name} has no document overflow and captures screenshot`, async ({
          context,
          page,
        }) => {
          await addSession(context);
          await page.goto(route.path);
          await page.addStyleTag({
            content: `
              [aria-label="Open Next.js Dev Tools"],
              [data-nextjs-dev-tools-button],
              nextjs-portal {
                display: none !important;
              }
            `,
          });
          await expect(page.locator("main")).toBeVisible();
          await expect(page.getByText("Application error")).toHaveCount(0);
          await expect(page.getByText(/fetch failed/i)).toHaveCount(0);

          const visualIssues = await page.evaluate(() => {
            const tolerance = 1;
            const root = document.documentElement;
            const body = document.body;
            const viewportWidth = root.clientWidth;
            const issues: string[] = [];

            if (root.scrollWidth > viewportWidth + tolerance) {
              issues.push(`document:${root.scrollWidth}>${viewportWidth}`);
            }

            if (body.scrollWidth > viewportWidth + tolerance) {
              issues.push(`body:${body.scrollWidth}>${viewportWidth}`);
            }

            const isVisible = (element: Element) => {
              const style = window.getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                rect.width > 0 &&
                rect.height > 0
              );
            };

            const hasHorizontalScrollContainer = (element: Element) => {
              let current: Element | null = element.parentElement;

              while (current && current !== document.body) {
                const style = window.getComputedStyle(current);
                const scrollsHorizontally =
                  ["auto", "scroll"].includes(style.overflowX) &&
                  current.scrollWidth > current.clientWidth + tolerance;

                if (scrollsHorizontally) return true;
                current = current.parentElement;
              }

              return false;
            };

            const selector = [
              "a",
              "button",
              "input:not([type='hidden'])",
              "select",
              "textarea",
              "[role='button']",
              "[role='link']",
            ].join(",");

            document.querySelectorAll(selector).forEach((element, index) => {
              if (!isVisible(element)) return;
              if (hasHorizontalScrollContainer(element)) return;

              const rect = element.getBoundingClientRect();
              const leftOverflow = rect.left < -tolerance;
              const rightOverflow = rect.right > viewportWidth + tolerance;

              if (leftOverflow || rightOverflow) {
                const label =
                  element.textContent?.trim() ||
                  element.getAttribute("aria-label") ||
                  element.getAttribute("name") ||
                  element.tagName.toLowerCase();

                issues.push(`control:${index}:${label}:${Math.round(rect.left)}-${Math.round(rect.right)}`);
              }
            });

            if (issues.some((issue) => issue.startsWith("document:") || issue.startsWith("body:"))) {
              const overflowingElements = Array.from(document.body.querySelectorAll("*"))
                .filter(isVisible)
                .map((element) => {
                  const rect = element.getBoundingClientRect();
                  return {
                    className: element.getAttribute("class") ?? "",
                    right: rect.right,
                    tag: element.tagName.toLowerCase(),
                    text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 48) ?? "",
                    width: rect.width,
                  };
                })
                .filter((element) => element.right > viewportWidth + tolerance)
                .sort((a, b) => b.right - a.right)
                .slice(0, 3);

              overflowingElements.forEach((element) => {
                issues.push(
                  `element:${element.tag}:${Math.round(element.right)}:${element.className || element.text}`,
                );
              });
            }

            return issues;
          });

          expect(visualIssues).toEqual([]);

          await page.screenshot({
            fullPage: true,
            path: path.join(evidenceDir, `${viewport.name}-${route.name}.png`),
          });
        });
      }
    });
  }
});
