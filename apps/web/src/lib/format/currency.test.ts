import { describe, expect, it } from "vitest";
import { parseMoney } from "./currency";

describe("parseMoney", () => {
  it.each([
    ["30", "30"],
    ["30,5", "30.5"],
    ["30,50", "30.50"],
    ["30.50", "30.50"],
    ["  7,25 ", "7.25"],
    ["0", "0"],
    ["0,00", "0.00"],
    ["007", "7"],
    ["1234567890,99", "1234567890.99"],
  ])("acepta %s", (input, expected) => {
    expect(parseMoney(input)).toEqual({ ok: true, value: expected });
  });

  it.each(["1.234,50", "1,234.50", "30,505", "-5", "abc", "30,", ",50", "3 0", "1e3"])(
    "rechaza %s",
    (input) => {
      expect(parseMoney(input)).toEqual({ ok: false, reason: "format" });
    },
  );

  it("vacio", () => {
    expect(parseMoney("")).toEqual({ ok: false, reason: "empty" });
    expect(parseMoney("   ")).toEqual({ ok: false, reason: "empty" });
    expect(parseMoney(null)).toEqual({ ok: false, reason: "empty" });
  });

  it("mas de 10 digitos enteros", () => {
    expect(parseMoney("12345678901")).toEqual({ ok: false, reason: "too_long" });
  });
});

