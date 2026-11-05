import { describe, expect, it } from "vitest";
import { joinInternationalPhone, splitInternationalPhone } from "./phone";

describe("splitInternationalPhone", () => {
  it.each([
    ["59170000000", "BO", "70000000"],
    ["5491123456789", "AR", "91123456789"],
    ["51987654321", "PE", "987654321"],
    ["34612345678", "ES", "612345678"],
    ["17875551234", "PR", "7875551234"],
    ["18095551234", "DO", "8095551234"],
    ["13055551234", "US", "3055551234"],
  ])("detects the country of %s", (value, country, local) => {
    expect(splitInternationalPhone(value)).toEqual({ country, local });
  });

  it("treats a number without a known country code as local to the fallback country", () => {
    expect(splitInternationalPhone("70000000")).toEqual({ country: "BO", local: "70000000" });
    expect(splitInternationalPhone("", "MX")).toEqual({ country: "MX", local: "" });
    expect(splitInternationalPhone(null)).toEqual({ country: "BO", local: "" });
  });
});

describe("joinInternationalPhone", () => {
  it("prefixes the dial code and keeps only digits", () => {
    expect(joinInternationalPhone("BO", "700 00-000")).toBe("59170000000");
    expect(joinInternationalPhone("MX", "55 1234 5678")).toBe("525512345678");
  });

  it("drops the national trunk 0", () => {
    expect(joinInternationalPhone("AR", "011 2345 6789")).toBe("541123456789");
  });

  it("returns an empty string when there is no number", () => {
    expect(joinInternationalPhone("BO", "  ")).toBe("");
  });
});
