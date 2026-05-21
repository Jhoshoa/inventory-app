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
