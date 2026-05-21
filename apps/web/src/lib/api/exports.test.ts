import { describe, expect, it } from "vitest";
import { buildExportBackendUrl } from "./exports";

describe("buildExportBackendUrl", () => {
  it("forwards query params to the backend export endpoint", () => {
    const url = buildExportBackendUrl(
      "http://localhost:3000/api/exports/sales?from=2026-05-01&to=2026-05-20",
      "sales.csv",
    );

    expect(url.toString()).toBe(
      "http://localhost:8000/api/v1/exports/sales.csv?from=2026-05-01&to=2026-05-20",
    );
  });
});
