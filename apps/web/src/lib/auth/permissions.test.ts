import { describe, expect, it } from "vitest";
import {
  canConfirmImport,
  canExport,
  canManageSettings,
  canVoidSale,
  isOwner,
} from "./permissions";

describe("permissions", () => {
  it("allows owner administrative actions", () => {
    expect(isOwner("owner")).toBe(true);
    expect(canExport("owner")).toBe(true);
    expect(canVoidSale("owner")).toBe(true);
    expect(canManageSettings("owner")).toBe(true);
    expect(canConfirmImport("owner")).toBe(true);
  });

  it("blocks cashier administrative actions", () => {
    expect(isOwner("cashier")).toBe(false);
    expect(canExport("cashier")).toBe(false);
    expect(canVoidSale("cashier")).toBe(false);
    expect(canManageSettings("cashier")).toBe(false);
    expect(canConfirmImport("cashier")).toBe(false);
  });
});
