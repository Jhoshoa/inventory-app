import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    // En CI, contra el build de producción (`pnpm build` corre antes): `next dev` compila
    // cada página al abrirla y con dos workers llega a su límite de memoria y se reinicia.
    command: process.env.CI ? "corepack pnpm exec next start -p 3100" : "corepack pnpm exec next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
