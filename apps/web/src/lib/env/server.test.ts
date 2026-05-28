import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_BACKEND_API_URL, getBackendApiUrl } from "./server";

describe("getBackendApiUrl", () => {
  const originalBackendApiUrl = process.env.BACKEND_API_URL;

  afterEach(() => {
    if (originalBackendApiUrl === undefined) {
      delete process.env.BACKEND_API_URL;
      return;
    }

    process.env.BACKEND_API_URL = originalBackendApiUrl;
  });

  it("uses the local backend port 8001 by default", () => {
    delete process.env.BACKEND_API_URL;

    expect(getBackendApiUrl()).toBe(DEFAULT_BACKEND_API_URL);
    expect(getBackendApiUrl()).toBe("http://localhost:8001");
  });

  it("normalizes configured backend urls", () => {
    process.env.BACKEND_API_URL = " http://localhost:9000/ ";

    expect(getBackendApiUrl()).toBe("http://localhost:9000");
  });

  it("falls back to the default when the configured value is blank", () => {
    process.env.BACKEND_API_URL = " ";

    expect(getBackendApiUrl()).toBe(DEFAULT_BACKEND_API_URL);
  });
});
