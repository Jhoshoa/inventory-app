import type { ProductBatch } from "./types";

/** "2026-12-31" -> "31/12/2026", sin pasar por Date (no se corre de dia). */
export function formatExpiryDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

export function daysLeftLabel(batch: Pick<ProductBatch, "days_left">) {
  const days = batch.days_left;
  if (days < -1) return `Vencio hace ${-days} dias`;
  if (days === -1) return "Vencio ayer";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence manana";
  return `Vence en ${days} dias`;
}

export const BATCH_STATUS_LABEL: Record<ProductBatch["status"], string> = {
  ok: "Vigente",
  expiring: "Por vencer",
  expired: "Vencido",
  depleted: "Agotado",
};

export const BATCH_STATUS_VARIANT = {
  ok: "success",
  expiring: "warning",
  expired: "danger",
  depleted: "default",
} as const satisfies Record<ProductBatch["status"], "success" | "warning" | "danger" | "default">;

export function batchOptionLabel(batch: ProductBatch, unit = "u.") {
  const suffix = batch.status === "expired" ? " (vencido)" : batch.status === "expiring" ? " (por vencer)" : "";
  return `Vence ${formatExpiryDate(batch.expires_on)} · ${batch.quantity_remaining} ${unit}${suffix}`;
}
