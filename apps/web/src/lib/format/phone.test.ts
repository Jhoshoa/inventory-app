import { describe, expect, it } from "vitest";
import {
  formatPhone,
  joinInternationalPhone,
  sanitizeLocalPhone,
  splitInternationalPhone,
  validateInternationalPhone,
} from "./phone";

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

describe("phone validation (same rules as the backend)", () => {
  it.each([
    ["59170012345", undefined],
    ["59122123456", undefined],
    ["5491123456789", undefined],
    ["", undefined],
    ["5917001234", "Un número de Bolivia tiene 8 dígitos, ej. 70012345"],
    ["59190012345", "Un número de Bolivia tiene 8 dígitos, ej. 70012345"],
    ["59170o12345", "El teléfono solo puede tener números"],
    ["123456", "Revisa el número: con el código de país debe tener entre 10 y 15 dígitos"],
  ])("%s -> %s", (value, error) => {
    expect(validateInternationalPhone(value)).toBe(error);
  });

  it("can require a number", () => {
    expect(validateInternationalPhone(" ", { required: true })).toBe("Escribe el teléfono");
  });
});

describe("sanitizeLocalPhone", () => {
  it("keeps only digits and the length of the country", () => {
    expect(sanitizeLocalPhone("BO", "7a0-01 2345")).toBe("70012345");
    expect(sanitizeLocalPhone("BO", "700123456789")).toBe("70012345");
  });

  it("drops the country code of a pasted international number", () => {
    expect(sanitizeLocalPhone("BO", "+591 700 12345")).toBe("70012345");
    expect(sanitizeLocalPhone("AR", "+54 9 11 2345 6789")).toBe("91123456789");
  });
});

describe("formatPhone", () => {
  it("shows the country code, assuming Bolivia for old local numbers", () => {
    expect(formatPhone("59170012345")).toBe("+591 70012345");
    expect(formatPhone("70012345")).toBe("+591 70012345");
    expect(formatPhone("5491123456789")).toBe("+54 91123456789");
    expect(formatPhone(null)).toBe("");
  });
});

