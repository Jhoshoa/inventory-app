import { PAYMENT_METHOD_LABEL, isPaymentMethod, receiptText } from "@/features/pos/schemas";
import { formatTimeShort } from "@/lib/format/datetime";
import type { SalesReport } from "@/features/reports/types";
import type { Sale, SaleSearchParams, SaleStatusFilter } from "./types";

// Lista de ventas (tablero P06): rangos rápidos, grupos por día y textos de cada venta.

const BOLIVIA_TIMEZONE = "America/La_Paz";
/** La API no acepta rangos de más de 90 días. */
export const MAX_RANGE_DAYS = 90;
/** Razones rápidas al anular (llenan el texto, se puede editar). */
export const VOID_REASONS = ["Error al cobrar", "Cliente devolvió", "Venta duplicada"] as const;
/** Así marca Vender las ventas hechas en línea; otro valor = hecha sin conexión y enviada luego. */
export const ONLINE_DEVICE_ID = "web-pos";

export type RangePreset = "today" | "yesterday" | "week" | "custom";

export const RANGE_PRESETS: { value: Exclude<RangePreset, "custom">; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "week", label: "7 días" },
];

export const STATUS_CHIPS: { value: SaleStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "completed", label: "Completadas" },
  { value: "voided", label: "Anuladas" },
];

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: BOLIVIA_TIMEZONE,
});

/** "2026-11-12": el día de hoy (o de `value`) en Bolivia. */
export function businessDateKey(value: Date | string = new Date()) {
  return dateKeyFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Rango de un chip. Nunca empieza antes del primer día de la tienda (la API responde 400);
 * null si todo el rango es anterior (por ejemplo "Ayer" el primer día).
 */
export function presetRange(preset: Exclude<RangePreset, "custom">, today: string, firstBusinessDate: string | null) {
  const to = preset === "yesterday" ? shiftDate(today, -1) : today;
  let from = preset === "week" ? shiftDate(today, -6) : to;
  if (firstBusinessDate && to < firstBusinessDate) return null;
  if (firstBusinessDate && from < firstBusinessDate) from = firstBusinessDate;
  return { from_date: from, to_date: to };
}

/** Qué chip corresponde al rango; "custom" si no es ninguno. */
export function activePreset(from: string, to: string, today: string, firstBusinessDate: string | null): RangePreset {
  for (const { value } of RANGE_PRESETS) {
    const range = presetRange(value, today, firstBusinessDate);
    if (range && range.from_date === from && range.to_date === to) return value;
  }
  return "custom";
}

/** Validación de "Elegir fechas"; null si el rango sirve. */
export function validateRange(from: string, to: string, firstBusinessDate: string | null) {
  if (!from || !to) return "Elige las dos fechas.";
  if (from > to) return "\"Desde\" no puede ser posterior a \"Hasta\".";
  if (firstBusinessDate && from < firstBusinessDate) {
    return `La tienda empezó a vender el ${dayMonthYear(firstBusinessDate)}; elige desde esa fecha.`;
  }
  if (daysBetween(from, to) > MAX_RANGE_DAYS) return `Elige un rango de hasta ${MAX_RANGE_DAYS} días.`;
  return null;
}

const weekdayFormatter = new Intl.DateTimeFormat("es-BO", { weekday: "long", timeZone: "UTC" });

function dayMonth(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function dayMonthYear(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

/** "Martes 10/11". */
export function dayHeading(dateKey: string) {
  const weekday = weekdayFormatter.format(new Date(`${dateKey}T00:00:00.000Z`));
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${dayMonth(dateKey)}`;
}

/** "Hoy", "Ayer", "7 días" o "10/11 – 12/11" para el resumen. */
export function rangeLabel(from: string, to: string, today: string, firstBusinessDate: string | null) {
  const preset = activePreset(from, to, today, firstBusinessDate);
  if (preset !== "custom") return RANGE_PRESETS.find((item) => item.value === preset)?.label ?? "";
  return from === to ? dayMonthYear(from) : `${dayMonth(from)} – ${dayMonth(to)}`;
}

/** "Hoy 11:47", "Ayer 09:10" o "10/11/2026 11:47". */
export function saleWhen(createdAt: string, today: string) {
  const key = businessDateKey(createdAt);
  const day = key === today ? "Hoy" : key === shiftDate(today, -1) ? "Ayer" : dayMonthYear(key);
  return `${day} ${formatTimeShort(createdAt)}`;
}

/** "10/11/2026 11:47" (recibo). */
export function saleDateTime(createdAt: string) {
  return `${dayMonthYear(businessDateKey(createdAt))} ${formatTimeShort(createdAt)}`;
}

/**
 * Día en que se hizo la venta (en Bolivia). No el día de caja: una caja abierta ayer
 * sigue vendiendo hoy, y la lista filtra por la hora de la venta.
 */
export function saleDayKey(sale: Pick<Sale, "created_at">) {
  return businessDateKey(sale.created_at);
}

export interface SaleDayGroup {
  date: string;
  /** Suma de las completadas que están cargadas (las anuladas no cuentan). */
  total: number;
  sales: Sale[];
}

/** Agrupa por día en el orden que viene (más recientes primero). */
export function groupSalesByDay(sales: Sale[]): SaleDayGroup[] {
  const groups: SaleDayGroup[] = [];
  for (const sale of sales) {
    const date = saleDayKey(sale);
    let group = groups.find((item) => item.date === date);
    if (!group) {
      group = { date, total: 0, sales: [] };
      groups.push(group);
    }
    group.sales.push(sale);
    if (sale.status === "completed") group.total += Number(sale.total);
  }
  return groups;
}

/** "Coca Cola 2l × 2, Papas Fritas 120g +1 más". */
export function itemsSummary(sale: Pick<Sale, "items">) {
  const names = sale.items.map((item) => (item.quantity > 1 ? `${item.product_name} × ${item.quantity}` : item.product_name));
  if (names.length === 0) return "Sin productos";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} más`;
}

export function saleUnits(sale: Pick<Sale, "items">) {
  return sale.items.reduce((count, item) => count + item.quantity, 0);
}

export function paymentLabel(method: string) {
  return isPaymentMethod(method) ? PAYMENT_METHOD_LABEL[method] : method.charAt(0).toUpperCase() + method.slice(1);
}

/** "En línea" o "Sin conexión, enviada después". */
export function saleSourceLabel(deviceId: string | null | undefined) {
  if (!deviceId || deviceId === ONLINE_DEVICE_ID) return "En línea";
  return "Sin conexión, enviada después";
}

export function shortSaleId(id: string) {
  return id.slice(0, 8);
}

/** Texto del recibo para WhatsApp (el mismo formato que Vender). */
export function saleReceiptText(sale: Sale, storeName: string, today: string) {
  return receiptText({
    storeName,
    when: `${saleWhen(sale.created_at, today)} · venta ${shortSaleId(sale.id)}`,
    items: sale.items.map((item) => ({ name: item.product_name, quantity: item.quantity, amount: Number(item.subtotal) })),
    total: Number(sale.total),
    discount: Number(sale.discount_amount),
    paymentLabel: paymentLabel(sale.payment_method),
  });
}

export function whatsappHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Enlace de "Exportar": el mismo rango de la lista. */
export function exportHref(params: Pick<SaleSearchParams, "from_date" | "to_date">) {
  const query = new URLSearchParams();
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);
  return `/api/exports/sales?${query.toString()}`;
}

/** Totales del rango (GET /reports/sales) y cuántas anuladas hay; null si no respondió. */
export interface SalesSummary {
  count: number;
  total: number;
  byMethod: { method: string; total: number }[];
  voided: number | null;
}

export function toSalesSummary(report: SalesReport | null, voided: number | null): SalesSummary | null {
  if (!report) return null;
  return {
    count: report.sales_count,
    total: Number(report.total_sales),
    byMethod: report.by_payment_method
      .map((item) => ({ method: item.payment_method, total: Number(item.total) }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total),
    voided,
  };
}
