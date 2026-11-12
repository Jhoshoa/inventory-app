import { businessDateKey, shiftDate } from "@/features/sales/list";
import type {
  ReportRangePreset,
  ReportSearchParams,
  StockMovementSearchParams,
  StockMovementType,
} from "./types";

export const DEFAULT_REPORT_LIMIT = 50;
/** La API no acepta rangos de más de 90 días. */
export const MAX_REPORT_RANGE_DAYS = 90;
/** La tienda opera en Bolivia (UTC−4, sin horario de verano). */
const BOLIVIA_OFFSET = "-04:00";

const rangePresets = new Set<ReportRangePreset>(["today", "7d", "30d", "month", "custom"]);
const stockMovementTypes = new Set<StockMovementType>([
  "all",
  "sale",
  "sale_void",
  "manual_adjustment",
  "import",
  "stock_movement",
]);

/** Chips del rango (tablero P08): Hoy · 7 días · Mes; "Fechas" abre Desde / Hasta. */
export const RANGE_CHIPS: { value: Exclude<ReportRangePreset, "custom" | "30d">; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "month", label: "Mes" },
];

/**
 * Rango de la dirección (?range, ?from, ?to), con el día de hoy en Bolivia. Fechas que no
 * sirven (desde > hasta, más de 90 días) vuelven a "Hoy" en lugar de dar error.
 */
export function parseReportSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  now = new Date(),
): ReportSearchParams {
  const rangeValue = firstValue(searchParams.range);
  const range = rangePresets.has(rangeValue as ReportRangePreset) ? (rangeValue as ReportRangePreset) : "today";
  const from = normalizeDateInput(firstValue(searchParams.from));
  const to = normalizeDateInput(firstValue(searchParams.to));

  if (from && to) {
    if (validateReportRange(from, to)) return { range: "today", ...rangeToDates("today", now) };
    return { range, from, to };
  }
  if (range === "custom") {
    const fallback = rangeToDates("month", now);
    const resolved = { from: from ?? fallback.from, to: to ?? fallback.to };
    if (validateReportRange(resolved.from, resolved.to)) return { range: "today", ...rangeToDates("today", now) };
    return { range, ...resolved };
  }
  return { range, ...rangeToDates(range, now) };
}

/** null si el rango sirve; si no, el mensaje para mostrar. */
export function validateReportRange(from: string, to: string) {
  if (!from || !to) return "Elige las dos fechas.";
  if (from > to) return "\"Desde\" no puede ser posterior a \"Hasta\".";
  if (daysBetween(from, to) > MAX_REPORT_RANGE_DAYS) return `El rango máximo es ${MAX_REPORT_RANGE_DAYS} días.`;
  return null;
}

export function parseStockMovementSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  now = new Date(),
): StockMovementSearchParams {
  const reportParams = parseReportSearchParams(searchParams, now);
  const typeValue = firstValue(searchParams.type);

  return {
    ...reportParams,
    product_id: optionalString(firstValue(searchParams.product_id)),
    type: stockMovementTypes.has(typeValue as StockMovementType) ? (typeValue as StockMovementType) : "all",
    limit: parseBoundedInteger(firstValue(searchParams.limit), DEFAULT_REPORT_LIMIT, 1, 100),
    offset: parseBoundedInteger(firstValue(searchParams.offset), 0, 0, 100_000),
  };
}

export function datesForReportRange(range: ReportRangePreset, now = new Date()) {
  return rangeToDates(range === "custom" ? "month" : range, now);
}

/** El mismo largo justo antes: 04–10/11 → 28/10–03/11 (para "↑ 6% vs. semana anterior"). */
export function previousRange(from: string, to: string) {
  const days = daysBetween(from, to) + 1;
  return { from: shiftDate(from, -days), to: shiftDate(from, -1) };
}

export function comparisonLabel(from: string, to: string) {
  const days = daysBetween(from, to) + 1;
  if (days === 1) return "vs. el día anterior";
  if (days === 7) return "vs. semana anterior";
  return `vs. los ${days} días anteriores`;
}

/** Cambio en %, redondeado; null si antes no hubo ventas (no se puede comparar). */
export function percentChange(current: number, previous: number) {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildReportQueryString(params: ReportSearchParams) {
  const query = new URLSearchParams();
  query.set("range", params.range);
  query.set("from", params.from);
  query.set("to", params.to);
  return query.toString();
}

export function buildStockMovementQueryString(params: StockMovementSearchParams) {
  const query = new URLSearchParams(buildReportQueryString(params));
  if (params.product_id) query.set("product_id", params.product_id);
  query.set("type", params.type);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  return query.toString();
}

export function buildSalesReportApiQuery(params: Pick<ReportSearchParams, "from" | "to">) {
  const query = new URLSearchParams();
  query.set("from_date", params.from);
  query.set("to_date", params.to);
  return query.toString();
}

/** Movimientos de stock piden fecha y hora: los días van en hora de Bolivia, no en UTC. */
export function buildStockMovementApiQuery(params: StockMovementSearchParams) {
  const query = new URLSearchParams();
  query.set("from", `${params.from}T00:00:00.000${BOLIVIA_OFFSET}`);
  query.set("to", `${params.to}T23:59:59.999${BOLIVIA_OFFSET}`);
  if (params.product_id) query.set("product_id", params.product_id);
  if (params.type !== "all") query.set("type", params.type);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  return query.toString();
}

export function buildExportDateTimeQuery(params: Pick<ReportSearchParams, "from" | "to">) {
  return new URLSearchParams({
    from_date: params.from,
    to_date: params.to,
  }).toString();
}

export function averageTicket(totalSales: string, salesCount: number) {
  if (salesCount <= 0) return "0";
  return (Number(totalSales) / salesCount).toFixed(2);
}

function rangeToDates(range: Exclude<ReportRangePreset, "custom">, now: Date) {
  const to = businessDateKey(now);
  if (range === "today") return { from: to, to };
  if (range === "month") return { from: `${to.slice(0, 8)}01`, to };
  return { from: shiftDate(to, range === "7d" ? -6 : -29), to };
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function normalizeDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : value;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
