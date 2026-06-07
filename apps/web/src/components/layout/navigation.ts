import {
  BarChart3,
  Boxes,
  FileImage,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { canCreateImport, canViewSettings } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";

const canView = () => true;

export const appNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, allowed: canView },
  { href: "/dashboard/pos", label: "POS", icon: ShoppingCart, allowed: canView },
  { href: "/dashboard/products", label: "Productos", icon: Boxes, allowed: canView },
  { href: "/dashboard/imports", label: "Importaciones", icon: FileImage, allowed: canCreateImport },
  { href: "/dashboard/sales", label: "Ventas", icon: ReceiptText, allowed: canView },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3, allowed: canView },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings, allowed: canViewSettings },
] as const;

export function visibleNavItems(role: UserRole) {
  return appNavItems.filter((item) => item.allowed(role));
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
