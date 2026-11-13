import { canViewCashMovements, canViewStoreDayReports, canExport } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { buildReportQueryString } from "./schemas";
import type { ReportSearchParams } from "./types";

// Secciones de Reportes (tablero P08): pestañas en escritorio, accesos en el celular.

export type ReportSection = "ventas" | "cierres" | "caja" | "stock" | "descargas";

export const REPORT_SECTIONS: { key: ReportSection; label: string; path: string }[] = [
  { key: "ventas", label: "Ventas", path: "/dashboard/reports" },
  { key: "cierres", label: "Cierres de caja", path: "/dashboard/reports/store-days" },
  { key: "caja", label: "Movimientos de caja", path: "/dashboard/reports/cash-movements" },
  { key: "stock", label: "Movimientos de stock", path: "/dashboard/reports/stock-movements" },
  { key: "descargas", label: "Descargas", path: "/dashboard/reports/descargas" },
];

/** Cajero: Ventas y Movimientos de stock; lo demás es del dueño (como la API). */
export function canViewSection(section: ReportSection, role: UserRole | undefined) {
  if (section === "cierres") return canViewStoreDayReports(role);
  if (section === "caja") return canViewCashMovements(role);
  if (section === "descargas") return canExport(role);
  return true;
}

export function visibleSections(role: UserRole | undefined) {
  return REPORT_SECTIONS.filter((section) => canViewSection(section.key, role));
}

/** El enlace de una sección con el mismo rango (las pestañas lo comparten). */
export function sectionHref(section: ReportSection, params: ReportSearchParams) {
  const path = REPORT_SECTIONS.find((item) => item.key === section)?.path ?? "/dashboard/reports";
  return `${path}?${buildReportQueryString(params)}`;
}
