import { describe, expect, it } from "vitest";
import {
  canAdjustStock,
  canCancelImport,
  canConfirmImport,
  canCreateImport,
  canDeleteProduct,
  canExport,
  canManageProducts,
  canManageSettings,
  canOpenCloseStore,
  canReviewImport,
  canViewSettings,
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
    expect(canViewSettings("owner")).toBe(true);
    expect(canManageProducts("owner")).toBe(true);
    expect(canAdjustStock("owner")).toBe(true);
    expect(canDeleteProduct("owner")).toBe(true);
    expect(canCreateImport("owner")).toBe(true);
    expect(canReviewImport("owner")).toBe(true);
    expect(canCancelImport("owner")).toBe(true);
    expect(canOpenCloseStore("owner")).toBe(true);
  });

  it("blocks cashier administrative actions", () => {
    expect(isOwner("cashier")).toBe(false);
    expect(canExport("cashier")).toBe(false);
    expect(canVoidSale("cashier")).toBe(false);
    expect(canManageSettings("cashier")).toBe(false);
    expect(canConfirmImport("cashier")).toBe(false);
    expect(canViewSettings("cashier")).toBe(false);
    expect(canManageProducts("cashier")).toBe(false);
    expect(canAdjustStock("cashier")).toBe(false);
    expect(canDeleteProduct("cashier")).toBe(false);
    expect(canCreateImport("cashier")).toBe(false);
    expect(canReviewImport("cashier")).toBe(false);
    expect(canCancelImport("cashier")).toBe(false);
    expect(canOpenCloseStore("cashier")).toBe(false);
  });
});
