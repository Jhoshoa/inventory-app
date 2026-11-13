// Lógica de Inicio (tableros "A · Inicio"): periodos, comparación y saludo.
// Las fechas son de la tienda, en Bolivia (mismo criterio que lib/format/datetime).

const BOLIVIA_TIMEZONE = "America/La_Paz";

export type HomePeriod = "today" | "7d" | "month";

export const HOME_PERIODS: Array<{ value: HomePeriod; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "month", label: "Mes" },
];

export function parseHomePeriod(value: string | string[] | undefined): HomePeriod {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "7d" || first === "month" ? first : "today";
}

export interface DateRange {
  from: string;
  to: string;
}

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOLIVIA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Bolivia, "AAAA-MM-DD". */
export function boliviaToday(now: Date = new Date()) {
  return isoFormatter.format(now);
}

function shift(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

/** Rango del periodo elegido, terminando hoy. */
export function periodRange(period: HomePeriod, today: string): DateRange {
  if (period === "7d") return { from: shift(today, -6), to: today };
  if (period === "month") return { from: monthStart(today), to: today };
  return { from: today, to: today };
}

/**
 * Con qué se compara: hoy contra el mismo día de la semana pasada; 7 días
 * contra los 7 anteriores; el mes contra los mismos días del mes anterior.
 */
export function comparisonRange(period: HomePeriod, today: string): DateRange & { label: string } {
  if (period === "7d") {
    return { from: shift(today, -13), to: shift(today, -7), label: "los 7 días anteriores" };
  }
  if (period === "month") {
    const start = new Date(`${monthStart(today)}T12:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() - 1);
    const from = start.toISOString().slice(0, 10);
    const day = Number(today.slice(8, 10));
    const lastDayPrev = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    const to = `${from.slice(0, 7)}-${String(Math.min(day, lastDayPrev)).padStart(2, "0")}`;
    return { from, to, label: "el mes pasado" };
  }
  const weekday = new Intl.DateTimeFormat("es-BO", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${today}T12:00:00Z`),
  );
  return { from: shift(today, -7), to: shift(today, -7), label: `el ${weekday} pasado` };
}

/** "↑ 12%": null si no hay con qué comparar (el periodo anterior vendió 0). */
export function percentChange(current: string | number, previous: string | number) {
  const now = Number(current);
  const before = Number(previous);
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) return null;
  const percent = Math.round(((now - before) / before) * 100);
  return { percent: Math.abs(percent), direction: percent > 0 ? "up" : percent < 0 ? "down" : "same" } as const;
}

/** "Buen día", "Buenas tardes" o "Buenas noches" según la hora en Bolivia. */
export function greeting(now: Date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: BOLIVIA_TIMEZONE }).format(now),
  );
  if (hour >= 5 && hour < 12) return "Buen día";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** "Martes 10 de noviembre". */
export function longDate(iso: string) {
  const text = new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
  const clean = text.replace(",", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** "hace 25 min", "hace 2 h", "hace 3 días". */
export function timeAgo(iso: string, now: Date = new Date()) {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

export function paymentMethodLabel(method: string | null | undefined) {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
