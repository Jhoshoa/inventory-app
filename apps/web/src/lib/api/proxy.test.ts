import { describe, expect, it } from "vitest";
import { buildBackendUrl } from "./proxy";

describe("buildBackendUrl", () => {
  it("forwards path and query to the backend API", () => {
    const url = buildBackendUrl(
      "http://localhost:3010/api/products?limit=10&search=rice",
      ["products"],
    );

    expect(url.toString()).toBe(
      "http://localhost:8001/api/v1/products?limit=10&search=rice",
    );
  });
});
