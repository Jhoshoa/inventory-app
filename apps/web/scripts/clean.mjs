import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const targets = [".next", "test-results", "playwright-report"];

for (const target of targets) {
  await rm(resolve(process.cwd(), target), { recursive: true, force: true });
}
