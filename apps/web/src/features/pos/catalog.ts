import { getOfflineDb, type OfflineProduct } from "@/lib/offline/db";
import { isDiscountExpired } from "@/lib/offline/syncEngine";
import type { PosProduct } from "./types";

/** Producto guardado en el equipo → producto de Vender. Sin conexión el descuento puede vencer después del último sync: se recalcula al leer. */
export function toPosProduct(product: OfflineProduct): PosProduct {
  const expired = isDiscountExpired(product.discount_ends_at);
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    unit: product.unit,
    qr_code: product.qr_code,
    discount_type: expired ? null : product.discount_type,
    discount_value: expired ? "0" : product.discount_value,
    effective_price: expired ? product.price : product.effective_price,
    locations: product.locations ?? [],
  };
}

const TOP_KEY = "pos.top-products.v1";
export const TOP_PRODUCTS_SHOWN = 8;

/**
 * "Más vendidos" (tablero A · POS): los ids vienen del reporte de ventas de 30 días y
 * se guardan en el equipo para usarlos sin conexión; los datos (precio, stock) salen
 * del catálogo guardado, así también funciona sin internet.
 */
export async function loadTopProducts(freshIds: string[] | null): Promise<PosProduct[]> {
  let ids = freshIds;
  try {
    if (ids && ids.length > 0) window.localStorage.setItem(TOP_KEY, JSON.stringify(ids));
    else ids = JSON.parse(window.localStorage.getItem(TOP_KEY) ?? "[]") as string[];
  } catch {
    ids = ids ?? [];
  }
  if (!ids || ids.length === 0) return [];
  try {
    const found = await getOfflineDb().products.bulkGet(ids.slice(0, TOP_PRODUCTS_SHOWN));
    return found.filter((product): product is OfflineProduct => Boolean(product) && !product!.deleted).map(toPosProduct);
  } catch {
    return [];
  }
}
