import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { usePageVisible } from "./usePageVisible";

let visibility: DocumentVisibilityState = "visible";

describe("usePageVisible", () => {
  beforeAll(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    visibility = "visible";
  });

  it("follows the page going to the background and back", () => {
    const { result } = renderHook(() => usePageVisible());
    expect(result.current).toBe(true);

    visibility = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(false);

    visibility = "visible";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(true);
  });
});
