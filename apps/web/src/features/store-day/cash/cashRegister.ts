import { parseMoney } from "@/lib/format/currency";
import type { CashMovement, StoreDay, StoreDayEvent } from "../types";

const TIMEZONE_LABELS: Record<string, string> = {
  "America/La_Paz": "Bolivia (La Paz)",
};

/** "America/La_Paz" → "Bolivia (La Paz)". Otras zonas se muestran tal cual. */
export function timezoneLabel(timezone: string | null | undefined) {
  if (!timezone) return "";
  return TIMEZONE_LABELS[timezone] ?? timezone.replace(/_/g, " ");
}

export type CashMovementDirection = "in" | "out";

/** Tipos que la API acepta, por dirección (tablero P09). */
export const MOVEMENT_TYPES: Record<CashMovementDirection, Array<{ value: string; label: string }>> = {
  in: [{ value: "cash_in", label: "Entrada" }],
  out: [
    { value: "expense", label: "Gasto" },
    { value: "cash_out", label: "Salida" },
    { value: "withdrawal", label: "Retiro" },
    { value: "deposit", label: "Depósito al banco" },
  ],
};

export function movementTypeLabel(type: string) {
  for (const options of Object.values(MOVEMENT_TYPES)) {
    const match = options.find((option) => option.value === type);
    if (match) return match.label;
  }
  return type;
}

/** "el gasto", "la salida": para "¿Anular el gasto de Bs 30,00?". */
export function movementWithArticle(type: string) {
  const label = movementTypeLabel(type).toLowerCase();
  const feminine = type === "cash_out" || type === "cash_in";
  return `${feminine ? "la" : "el"} ${label}`;
}

/**
 * Lo que falta o sobra al contar: contado − debería haber, en centavos para no
 * arrastrar errores de punto flotante. null si lo escrito no es un monto válido.
 */
export function cashDifference(counted: string, expected: string | null | undefined) {
  const parsed = parseMoney(counted);
  if (!parsed.ok || expected === null || expected === undefined) return null;
  const toCents = (value: string) => Math.round(Number(value) * 100);
  const cents = toCents(parsed.value) - toCents(expected);
  return { cents, amount: (Math.abs(cents) / 100).toFixed(2), kind: cents === 0 ? "even" : cents < 0 ? "short" : "over" } as const;
}

/** Si la jornada de hoy ya se cerró: no se abre otra, se reabre la de hoy (regla de la API). */
export function isClosedToday(storeDay: StoreDay) {
  return storeDay.status !== "open" && Boolean(storeDay.id && storeDay.closed_at);
}

export function activeMovements(movements: CashMovement[]) {
  return movements.filter((movement) => !movement.voided_at);
}

export const EVENT_LABELS: Record<string, string> = {
  open: "Apertura",
  close: "Cierre",
  reopen: "Reapertura",
};

export function eventLabel(event: StoreDayEvent) {
  return EVENT_LABELS[event.event_type] ?? event.event_type;
}

/** Nombre para mostrar; si no está en la lista de personas (cajero o API caída), nada. */
export function personName(names: Record<string, string>, userId: string | null | undefined) {
  return userId ? names[userId] ?? null : null;
}
