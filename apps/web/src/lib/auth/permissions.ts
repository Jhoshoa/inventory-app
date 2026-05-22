import type { UserRole } from "./types";

export function isOwner(role: UserRole | undefined): boolean {
  return role === "owner";
}

export function canExport(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canVoidSale(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canManageSettings(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canConfirmImport(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canViewSettings(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canManageProducts(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canAdjustStock(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canDeleteProduct(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canCreateImport(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canReviewImport(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canCancelImport(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canOpenCloseStore(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canViewStoreDayReports(role: UserRole | undefined): boolean {
  return isOwner(role);
}

export function canViewCashMovements(role: UserRole | undefined): boolean {
  return isOwner(role);
}
