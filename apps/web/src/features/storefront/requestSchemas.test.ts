import { describe, expect, it } from "vitest";
import { validateStorefrontRequestForm } from "./requestSchemas";

const baseValues = { customerName: "Juan Perez", customerPhone: "70011122", note: "" };

describe("validateStorefrontRequestForm", () => {
  it("passes with valid values", () => {
    expect(validateStorefrontRequestForm(baseValues)).toEqual({});
  });

  it("requires a name", () => {
    const errors = validateStorefrontRequestForm({ ...baseValues, customerName: "" });
    expect(errors.customerName).toBeTruthy();
  });

  it("rejects a one-letter name", () => {
    const errors = validateStorefrontRequestForm({ ...baseValues, customerName: "J" });
    expect(errors.customerName).toBeTruthy();
  });

  it("requires a phone", () => {
    const errors = validateStorefrontRequestForm({ ...baseValues, customerPhone: "" });
    expect(errors.customerPhone).toBeTruthy();
  });

  it("rejects an invalid phone", () => {
    const errors = validateStorefrontRequestForm({ ...baseValues, customerPhone: "abc" });
    expect(errors.customerPhone).toBeTruthy();
  });

  it("rejects a note over 500 characters", () => {
    const errors = validateStorefrontRequestForm({ ...baseValues, note: "a".repeat(501) });
    expect(errors.note).toBeTruthy();
  });
});
