import { formatCurrency } from "@/lib/format/currency";
import { formatExpiryDate } from "./batches";
import { shortDate } from "./form";
import type { Product, ProductBatch, StockMovement } from "./types";

/** Descuento vigente: tiene tipo y no venció. */
export function hasLiveDiscount(product: Pick<Product, "discount_type" | "discount_ends_at">, now = Date.now()) {
  if (!product.discount_type) return false;
  return !product.discount_ends_at || new Date(product.discount_ends_at).getTime() > now;
}

/** "−10% hasta 14/11", "−Bs 0,80", o null sin descuento vigente. */
export function discountSummary(product: Pick<Product, "discount_type" | "discount_value" | "discount_ends_at">, now = Date.now()) {
  if (!hasLiveDiscount(product, now)) return null;
  const value =
    product.discount_type === "percentage"
      ? `−${Number(product.discount_value).toLocaleString("es-BO", { maximumFractionDigits: 2 })}%`
      : `−${formatCurrency(product.discount_value)}`;
  return product.discount_ends_at ? `${value} hasta ${shortDate(product.discount_ends_at.slice(0, 10))}` : value;
}

/** "Ganas Bs 1,65 con descuento" (precio efectivo − costo); null sin costo. */
export function profitLine(product: Pick<Product, "cost_price" | "price" | "effective_price" | "discount_type" | "discount_ends_at">) {
  if (product.cost_price === null || product.cost_price === "") return null;
  const discounted = hasLiveDiscount(product);
  const price = Number(discounted ? product.effective_price : product.price);
  const amount = Math.round((price - Number(product.cost_price)) * 100) / 100;
  const suffix = discounted ? " con descuento" : " por unidad";
  return amount < 0 ? `Pierdes ${formatCurrency(-amount)}${suffix}` : `Ganas ${formatCurrency(amount)}${suffix}`;
}

export function stockState(product: Pick<Product, "stock" | "min_stock">): { label: string; tone: "success" | "warning" | "danger" } {
  if (product.stock <= 0) return { label: "Sin stock", tone: "danger" };
  if (product.stock <= product.min_stock) return { label: "Bajo", tone: "warning" };
  return { label: "Disponible", tone: "success" };
}

/** Lotes con unidades, el que vence antes primero (los agotados no se listan). */
export function liveBatches(batches: ProductBatch[]) {
  return batches.filter((batch) => batch.quantity_remaining > 0).sort((a, b) => a.expires_on.localeCompare(b.expires_on));
}

/** "en 3 días", "hoy", "mañana", "venció hace 2 días". */
export function daysLeftText(daysLeft: number) {
  if (daysLeft < -1) return `venció hace ${-daysLeft} días`;
  if (daysLeft === -1) return "venció ayer";
  if (daysLeft === 0) return "vence hoy";
  if (daysLeft === 1) return "mañana";
  return `en ${daysLeft} días`;
}

export function batchDateLine(batch: Pick<ProductBatch, "expires_on" | "days_left" | "alert_days">) {
  return `${daysLeftText(batch.days_left)} · aviso ${batch.alert_days} ${batch.alert_days === 1 ? "día" : "días"} antes`;
}

export function formatBatchDate(batch: Pick<ProductBatch, "expires_on">) {
  return formatExpiryDate(batch.expires_on);
}

const MOVEMENT_LABEL: Record<string, string> = {
  sale: "Venta",
  sale_void: "Anulación de venta",
  manual_adjustment: "Ajuste",
  import: "Importación",
};

/** "Ajuste: Envase roto", "Venta", "Anulación de venta". */
export function movementLabel(movement: Pick<StockMovement, "movement_type" | "reason" | "sale_id">) {
  const base = MOVEMENT_LABEL[movement.movement_type] ?? "Movimiento";
  if (movement.movement_type === "manual_adjustment" && movement.reason) return `${base}: ${movement.reason}`;
  return base;
}

/** "Hoy 01:04", "Ayer 18:20", "10/11 14:03" en la hora del navegador. */
export function movementWhen(iso: string, now = new Date()) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dayKey = (value: Date) => `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(now)) return `Hoy ${time}`;
  if (dayKey(date) === dayKey(yesterday)) return `Ayer ${time}`;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month} ${time}`;
}

/** Datos para "Duplicar": todo menos SKU, código, stock y lotes (tablero P03). */
export function duplicateHref(productId: string) {
  return `/dashboard/products/new?duplicar=${encodeURIComponent(productId)}`;
}
