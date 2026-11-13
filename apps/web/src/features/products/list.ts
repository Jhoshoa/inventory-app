import { DEFAULT_PRODUCT_LIMIT } from "./schemas";
import type { Product, ProductSearchParams, ProductSortField, SortDirection, ProductStockFilter } from "./types";

/** Conteos para los chips y el subtítulo de la lista (tablero P01). */
export interface ProductListCounts {
  total: number;
  low: number;
  out: number;
  expiring: number;
}

export type StockTone = "ok" | "warn" | "bad";

/** Etiqueta de stock de la lista: "40 u.", "Quedan 2" o "Sin stock". */
export function stockTag(product: Pick<Product, "stock" | "min_stock" | "unit">): { label: string; tone: StockTone } {
  if (product.stock <= 0) return { label: "Sin stock", tone: "bad" };
  if (product.stock <= product.min_stock) return { label: `Quedan ${product.stock}`, tone: "warn" };
  return { label: `${product.stock} ${unitShort(product.unit)}`, tone: "ok" };
}

export function unitShort(unit: string) {
  const normalized = unit.trim().toLowerCase();
  if (!normalized || normalized === "u" || normalized.startsWith("unidad")) return "u.";
  return normalized;
}

export function productInitials(name: string) {
  const words = name.trim().split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  const letters = words.slice(0, 2).map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

const THUMB_COLORS = [
  { bg: "#FEF7C3", fg: "#854A0E" },
  { bg: "#ECFDF3", fg: "#085D3A" },
  { bg: "#FEE4E2", fg: "#912018" },
  { bg: "#F4EBFF", fg: "#53389E" },
  { bg: "#E0F2FE", fg: "#065986" },
  { bg: "#FCE7F6", fg: "#9E165F" },
] as const;

/** Color estable por nombre para la miniatura sin foto. */
export function thumbColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return THUMB_COLORS[hash % THUMB_COLORS.length];
}

/** Precio tachado: solo cuando hay un descuento vigente. */
export function hasActiveDiscount(product: Pick<Product, "price" | "effective_price">) {
  return Number(product.effective_price) < Number(product.price);
}

export function locationsLabel(product: Pick<Product, "locations">) {
  const labels = (product.locations ?? []).map((location) => location.label);
  return labels.length > 0 ? labels.join(", ") : null;
}

export function productMeta(product: Pick<Product, "sku" | "category">) {
  return [product.sku, product.category ?? "Sin categoría"].filter(Boolean).join(" · ");
}

/** "13/11 · 3 días", "18/11", "Vencido 09/11". Sin `today` (antes de montar) solo la fecha. */
export function expiryLabel(nextExpiry: string | null | undefined, today: string | null): { label: string; urgent: boolean } | null {
  if (!nextExpiry) return null;
  const [year, month, day] = nextExpiry.split("-");
  if (!year || !month || !day) return null;
  const short = `${day}/${month}`;
  if (!today) return { label: short, urgent: false };
  const days = Math.round((Date.parse(`${nextExpiry}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return { label: `Vencido ${short}`, urgent: true };
  if (days === 0) return { label: `${short} · hoy`, urgent: true };
  if (days <= 7) return { label: `${short} · ${days === 1 ? "1 día" : `${days} días`}`, urgent: true };
  return { label: short, urgent: false };
}

export function localToday(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export const STOCK_CHIPS: { value: ProductStockFilter; label: string; count?: keyof ProductListCounts }[] = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponible" },
  { value: "low", label: "Stock bajo", count: "low" },
  { value: "out", label: "Sin stock", count: "out" },
  { value: "expiring", label: "Por vencer", count: "expiring" },
];

export function chipLabel(label: string, count: number | undefined) {
  return count ? `${label} · ${count}` : label;
}

export const SORT_OPTIONS: { value: string; label: string; sort: ProductSortField; direction: SortDirection }[] = [
  { value: "name:asc", label: "Nombre A → Z", sort: "name", direction: "asc" },
  { value: "name:desc", label: "Nombre Z → A", sort: "name", direction: "desc" },
  { value: "stock:asc", label: "Menos stock primero", sort: "stock", direction: "asc" },
  { value: "stock:desc", label: "Más stock primero", sort: "stock", direction: "desc" },
  { value: "price:asc", label: "Precio menor primero", sort: "price", direction: "asc" },
  { value: "price:desc", label: "Precio mayor primero", sort: "price", direction: "desc" },
  { value: "updated_at:desc", label: "Cambiados hace poco", sort: "updated_at", direction: "desc" },
  { value: "updated_at:asc", label: "Sin cambios hace más", sort: "updated_at", direction: "asc" },
];

export const SORT_FIELD_LABEL: Record<ProductSortField, string> = {
  name: "Nombre",
  stock: "Stock",
  price: "Precio",
  updated_at: "Actualizado",
};

export function directionLabels(sort: ProductSortField): Record<SortDirection, string> {
  if (sort === "name") return { asc: "A → Z", desc: "Z → A" };
  if (sort === "updated_at") return { desc: "Más recientes", asc: "Más antiguos" };
  return { asc: "Menor primero", desc: "Mayor primero" };
}

/** Lo que va en la URL: solo lo que no es el valor por defecto (compartir el link mantiene la vista). */
export function productListSearch(params: ProductSearchParams) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category_id) query.set("category_id", params.category_id);
  else if (params.category) query.set("category", params.category);
  if (params.stock !== "all") query.set("stock", params.stock);
  if (params.sort !== "name") query.set("sort", params.sort);
  if (params.direction !== "asc") query.set("direction", params.direction);
  if (params.limit !== DEFAULT_PRODUCT_LIMIT) query.set("limit", String(params.limit));
  if (params.offset > 0) query.set("offset", String(params.offset));
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function hasActiveFilters(params: ProductSearchParams) {
  return Boolean(params.q || params.category || params.category_id || params.stock !== "all");
}

/** Filtros que quedan dentro de "Filtros" en el celular (los chips muestran Todos, Stock bajo y Por vencer). */
export function sheetFilterCount(params: ProductSearchParams) {
  let count = 0;
  if (params.category_id || params.category) count += 1;
  if (params.stock === "available" || params.stock === "out") count += 1;
  if (params.sort !== "name" || params.direction !== "asc") count += 1;
  return count;
}
