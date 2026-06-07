import { describe, expect, it } from "vitest";
import { buildExportBackendUrl } from "./exports";

describe("buildExportBackendUrl", () => {
  it("forwards query params to the backend export endpoint", () => {
    const url = buildExportBackendUrl(
      "http://localhost:3000/api/exports/sales?from=2026-05-01&to=2026-05-20",
      "sales.csv",
    );

    expect(url.toString()).toBe(
      "http://localhost:8001/api/v1/exports/sales.csv?from=2026-05-01&to=2026-05-20",
    );
  });

  it("builds cash movement export urls", () => {
    const url = buildExportBackendUrl(
      "http://localhost:3000/api/exports/cash-movements?from=2026-05-01&to=2026-05-20&type=expense",
      "cash-movements.csv",
    );

    expect(url.toString()).toBe(
      "http://localhost:8001/api/v1/exports/cash-movements.csv?from=2026-05-01&to=2026-05-20&type=expense",
    );
  });
});
