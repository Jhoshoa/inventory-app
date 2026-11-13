import { getOfflineDb, type OfflineProduct } from "@/lib/offline/db";
import { toPosProduct } from "./catalog";
import type { CartItem, PosProduct } from "./types";

// "Cobrar en Vender" (tablero P07): Pedidos deja el pedido en la pestaña y abre
// /dashboard/pos?pedido={id}; Vender lo toma, arma la venta y al final ofrece cerrarlo.

const ORDER_KEY = "pos.order.v1";

export interface PosOrder {
  id: string;
  customerName: string;
  items: { productId: string | null; name: string; quantity: number }[];
}

export function saveOrderForPos(order: PosOrder) {
  try {
    window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
    return true;
  } catch {
    return false;
  }
}

/** El pedido guardado por Pedidos, solo si es el de la dirección; se usa una vez. */
export function takeOrderForPos(id: string): PosOrder | null {
  try {
    const raw = window.sessionStorage.getItem(ORDER_KEY);
    window.sessionStorage.removeItem(ORDER_KEY);
    const order = raw ? (JSON.parse(raw) as PosOrder) : null;
    return order && order.id === id && Array.isArray(order.items) ? order : null;
  } catch {
    return null;
  }
}

export interface ResolvedOrder {
  items: CartItem[];
  /** Avisos para lo que no se pudo agregar tal cual. */
  notes: string[];
}

/** Arma la venta con lo que hay: borrados y sin stock no entran; si hay menos, entra lo que hay. */
export function resolveOrderItems(order: PosOrder, products: Map<string, PosProduct | null>): ResolvedOrder {
  const items: CartItem[] = [];
  const notes: string[] = [];
  for (const line of order.items) {
    const product = line.productId ? products.get(line.productId) : null;
    if (!product) {
      notes.push(`${line.name} ya no está en tu catálogo; no se agregó.`);
      continue;
    }
    if (product.stock <= 0) {
      notes.push(`${product.name} no tiene stock; no se agregó.`);
      continue;
    }
    const existing = items.find((item) => item.product.id === product.id);
    const wanted = (existing?.quantity ?? 0) + line.quantity;
    const quantity = Math.min(wanted, product.stock);
    if (quantity < wanted) notes.push(`${product.name}: pidieron ${wanted}, solo hay ${product.stock}.`);
    if (existing) existing.quantity = quantity;
    else items.push({ product, quantity });
  }
  return { items, notes };
}

/**
 * Datos de los productos del pedido: con conexión, de la API (stock al momento); sin
 * conexión o si la API no responde, del catálogo guardado. null = borrado o inactivo.
 */
export async function loadOrderProducts(ids: string[], isOnline: boolean): Promise<Map<string, PosProduct | null>> {
  const result = new Map<string, PosProduct | null>();
  const unique = [...new Set(ids)];
  let pending = unique;

  if (isOnline) {
    const fetched = await Promise.all(
      unique.map(async (id) => {
        try {
          const response = await fetch(`/api/products/${encodeURIComponent(id)}`, { cache: "no-store" });
          if (response.status === 404) return [id, null] as const;
          if (!response.ok) return [id, undefined] as const;
          const product = (await response.json()) as PosProduct & { is_active?: boolean };
          return [id, product.is_active === false ? null : product] as const;
        } catch {
          return [id, undefined] as const;
        }
      }),
    );
    for (const [id, product] of fetched) if (product !== undefined) result.set(id, product);
    pending = unique.filter((id) => !result.has(id));
  }

  if (pending.length > 0) {
    try {
      const saved = await getOfflineDb().products.bulkGet(pending);
      pending.forEach((id, index) => {
        const product = saved[index] as OfflineProduct | undefined;
        result.set(id, product && !product.deleted ? toPosProduct(product) : null);
      });
    } catch {
      pending.forEach((id) => result.set(id, null));
    }
  }
  return result;
}
