import { spawn } from "node:child_process";

const defaultBackendApiUrl = "http://localhost:8001";
const backendApiUrl = (process.env.BACKEND_API_URL || defaultBackendApiUrl).replace(/\/+$/, "");
const schemaUrl = `${backendApiUrl}/openapi.json`;
const command = process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript";

const child = spawn(
  command,
  [schemaUrl, "-o", "src/lib/api/generated/schema.d.ts"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
