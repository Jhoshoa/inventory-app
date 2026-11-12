import { formatTimeShort } from "@/lib/format/datetime";
import { businessDateKey } from "@/features/sales/list";
import type { StoreDayCloseReport } from "@/features/store-day/types";

// Cierres de caja en Reportes (tablero P08): diferencia, horario y nombre del día.

export type DifferenceKind = "even" | "short" | "over" | "uncounted";

/** "Cuadra" si es 0, falta o sobra con el monto, "Sin conteo" si se cerró sin contar. */
export function closingDifference(report: Pick<StoreDayCloseReport, "counted_cash_amount" | "cash_difference_amount">) {
  if (report.counted_cash_amount === null || report.cash_difference_amount === null) {
    return { kind: "uncounted" as DifferenceKind, amount: 0 };
  }
  const cents = Math.round(Number(report.cash_difference_amount) * 100);
  const kind: DifferenceKind = cents === 0 ? "even" : cents < 0 ? "short" : "over";
  return { kind, amount: Math.abs(cents) / 100 };
}

const weekdayFormatter = new Intl.DateTimeFormat("es-BO", { weekday: "short", timeZone: "UTC" });
const weekdayLongFormatter = new Intl.DateTimeFormat("es-BO", { weekday: "long", timeZone: "UTC" });

function capitalize(text: string) {
  const clean = text.replace(/\.$/, "");
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}`;
}

/** "Lun 09/11" (tabla) o "Lunes 09/11" (detalle). */
export function closingDay(businessDate: string, long = false) {
  const date = new Date(`${businessDate}T00:00:00.000Z`);
  const [, month, day] = businessDate.split("-");
  return `${capitalize((long ? weekdayLongFormatter : weekdayFormatter).format(date))} ${day}/${month}`;
}

/**
 * "08:00–21:10"; si cerró otro día, "16:20 – 12/11 16:39"; solo "cerró 21:10" si la API no
 * trae la apertura.
 */
export function closingHours(report: Pick<StoreDayCloseReport, "opened_at" | "closed_at">) {
  if (!report.closed_at) return "";
  if (!report.opened_at) return `cerró ${formatTimeShort(report.closed_at)}`;
  const closedDay = businessDateKey(report.closed_at);
  if (businessDateKey(report.opened_at) === closedDay) {
    return `${formatTimeShort(report.opened_at)}–${formatTimeShort(report.closed_at)}`;
  }
  const [, month, day] = closedDay.split("-");
  return `${formatTimeShort(report.opened_at)} – ${day}/${month} ${formatTimeShort(report.closed_at)}`;
}

/** QR + transferencia + tarjeta: lo vendido que no entra a la caja. */
export function nonCashSales(report: Pick<StoreDayCloseReport, "qr_sales_total" | "transfer_sales_total" | "card_sales_total">) {
  return Number(report.qr_sales_total) + Number(report.transfer_sales_total) + Number(report.card_sales_total);
}
