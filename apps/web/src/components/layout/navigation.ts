import {
  BarChart3,
  Boxes,
  Ellipsis,
  House,
  ReceiptText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { canViewSettings } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";

const canView = () => true;

// Nombres del rediseño (opción A): ver docs/rediseno-ui-opcion-a/README.md.
// Las rutas no cambian; solo los textos y el orden.
export const appNavItems = [
  { key: "inicio", href: "/dashboard", label: "Inicio", icon: House, allowed: canView },
  { key: "vender", href: "/dashboard/pos", label: "Vender", icon: ShoppingCart, allowed: canView },
  { key: "caja", href: "/dashboard/caja", label: "Caja", icon: Wallet, allowed: canView },
  { key: "productos", href: "/dashboard/products", label: "Productos", icon: Boxes, allowed: canView },
  { key: "ventas", href: "/dashboard/sales", label: "Ventas", icon: ReceiptText, allowed: canView },
  { key: "pedidos", href: "/dashboard/solicitudes", label: "Pedidos", icon: ShoppingBag, allowed: canView },
  { key: "reportes", href: "/dashboard/reports", label: "Reportes", icon: BarChart3, allowed: canView },
  {
    key: "configuracion",
    href: "/dashboard/settings",
    label: "Configuración",
    icon: Settings,
    allowed: canViewSettings,
  },
] as const;

export type NavItem = (typeof appNavItems)[number];
export type NavKey = NavItem["key"];

export function visibleNavItems(role: UserRole) {
  return appNavItems.filter((item) => item.allowed(role));
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const MORE_HREF = "/dashboard/mas";
export const MoreIcon = Ellipsis;

/** Lo que va en la pantalla Más del celular, en este orden. */
export function moreNavItems(role: UserRole) {
  const keys: NavKey[] = ["caja", "pedidos", "reportes", "configuracion"];
  return keys
    .map((key) => appNavItems.find((item) => item.key === key))
    .filter((item): item is NavItem => item !== undefined && item.allowed(role));
}

export type MobileTabKey = "inicio" | "productos" | "vender" | "ventas" | "mas";

/** Pestaña marcada en la barra de abajo. Lo que se abre desde Más deja marcado Más (tablero P00). */
export function activeMobileTab(pathname: string): MobileTabKey | null {
  if (pathname === "/dashboard") return "inicio";
  if (isNavItemActive(pathname, "/dashboard/products")) return "productos";
  if (isNavItemActive(pathname, "/dashboard/pos")) return "vender";
  if (isNavItemActive(pathname, "/dashboard/sales")) return "ventas";
  if (
    isNavItemActive(pathname, MORE_HREF) ||
    moreNavItems("owner").some((item) => isNavItemActive(pathname, item.href))
  ) {
    return "mas";
  }
  return null;
}

/** Ruta corta del encabezado en el celular para lo que se abre desde Más ("Más › Pedidos"). */
export function moreParentFor(pathname: string): { href: string; label: string } | null {
  return activeMobileTab(pathname) === "mas" && pathname !== MORE_HREF ? { href: MORE_HREF, label: "Más" } : null;
}

// Pantallas con su propia barra fija abajo (P00): ahí no va la barra de pestañas.
// Cada fase agrega las suyas cuando esa barra existe (Vender en la Fase 4,
// formularios de producto en la 3, detalle de venta en la 5).
const ROUTES_WITHOUT_TAB_BAR = [
  /^\/dashboard\/sales\/[^/]+\/print$/,
  // Formulario de producto: barra fija Cancelar · Crear producto (tablero P02).
  /^\/dashboard\/products\/new$/,
  /^\/dashboard\/products\/[^/]+\/edit$/,
  // Vender: barra fija "Ver venta · Cobrar" (Fase 4).
  /^\/dashboard\/pos$/,
  // Etiquetas: barra fija con el total y el paso siguiente (tablero P05).
  /^\/dashboard\/products\/labels$/,
];

export function shouldShowMobileTabBar(pathname: string) {
  return !ROUTES_WITHOUT_TAB_BAR.some((pattern) => pattern.test(pathname));
}

/** En Vender la barra lateral se angosta para dejar lugar a la venta. */
export function usesNarrowSidebar(pathname: string) {
  return isNavItemActive(pathname, "/dashboard/pos");
}
