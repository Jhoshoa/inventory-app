import { getDeviceId } from "./deviceId";
import { getOfflineDb, LAST_PULLED_AT_KEY, type OfflineProduct, type PendingSale } from "./db";

interface SyncChangePayload {
  client_change_id: string;
  entity: "product" | "sale" | "stock_movement";
  operation: "upsert" | "delete" | "create";
  entity_id: string;
  client_created_at: string;
  payload: Record<string, unknown>;
}

interface SyncChangeResult {
  client_change_id: string;
  entity: string;
  operation: string;
  entity_id: string;
  status: "accepted" | "duplicate" | "rejected" | "conflict";
  server_version: number | null;
  server_updated_at: string | null;
  error: { code: string; detail: string } | null;
}

interface SyncPushResponse {
  results: SyncChangeResult[];
  server_time: string;
}

interface SyncPullChange {
  entity: "product" | "sale" | "stock_movement";
  operation: "upsert" | "delete" | "create";
  entity_id: string;
  server_version: number | null;
  server_updated_at: string;
  payload: Record<string, unknown>;
}

interface SyncPullResponse {
  changes: SyncPullChange[];
  server_time: string;
}

const EPOCH = "1970-01-01T00:00:00.000Z";

export async function pullCatalog(): Promise<{ ok: boolean; updated: number }> {
  const db = getOfflineDb();
  const lastPulledRow = await db.meta.get(LAST_PULLED_AT_KEY);
  const since = lastPulledRow?.value ?? EPOCH;

  let response: Response;
  try {
    response = await fetch("/api/sync/pull", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: getDeviceId(), since }),
    });
  } catch {
    return { ok: false, updated: 0 };
  }
  if (!response.ok) return { ok: false, updated: 0 };

  const data = (await response.json()) as SyncPullResponse;
  let updated = 0;

  await db.transaction("rw", db.products, db.meta, async () => {
    for (const change of data.changes) {
      if (change.entity !== "product") continue;
      updated += 1;
      if (change.operation === "delete") {
        await db.products.delete(change.entity_id);
        continue;
      }
      const payload = change.payload as {
        id: string;
        name: string;
        price: string;
        stock: number;
        unit: string;
        qr_code: string | null;
        discount_type?: "percentage" | "fixed" | null;
        discount_value?: string;
      };
      const record: OfflineProduct = {
        id: payload.id,
        name: payload.name,
        price: payload.price,
        stock: payload.stock,
        unit: payload.unit,
        qr_code: payload.qr_code ?? null,
        discount_type: payload.discount_type ?? null,
        discount_value: payload.discount_value ?? "0",
        effective_price: computeEffectivePrice(
          payload.price,
          payload.discount_type ?? null,
          payload.discount_value ?? "0",
        ),
        deleted: false,
        serverUpdatedAt: change.server_updated_at,
      };
      await db.products.put(record);
    }
    await db.meta.put({ key: LAST_PULLED_AT_KEY, value: data.server_time });
  });

  return { ok: true, updated };
}

/** Descarga el catalogo completo una vez (sin filtro de "since"), para la
 * primera carga en un dispositivo nuevo o cuando el cache local esta vacio. */
export async function seedCatalogIfEmpty(): Promise<void> {
  const db = getOfflineDb();
  const count = await db.products.count();
  if (count > 0) return;
  const existingMeta = await db.meta.get(LAST_PULLED_AT_KEY);
  if (existingMeta) return;
  await pullCatalog();
}

function computeEffectivePrice(
  price: string,
  discountType: "percentage" | "fixed" | null,
  discountValue: string,
): string {
  const priceNum = Number(price);
  const valueNum = Number(discountValue);
  if (!discountType || Number.isNaN(priceNum) || Number.isNaN(valueNum)) return price;
  const discount = discountType === "percentage" ? (priceNum * valueNum) / 100 : valueNum;
  const effective = Math.max(0, priceNum - Math.min(discount, priceNum));
  return effective.toFixed(2);
}

export interface QueueSaleInput {
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_price: string }>;
  paymentMethod: string;
  customerName: string | null;
  discountType: "percentage" | "fixed" | null;
  discountValue: string;
  discountSourceOverride: string | null;
  totalEstimate: string;
}

export async function queueSale(input: QueueSaleInput): Promise<PendingSale> {
  const db = getOfflineDb();
  const sale: PendingSale = {
    id: crypto.randomUUID(),
    items: input.items,
    payment_method: input.paymentMethod,
    customer_name: input.customerName,
    discount_type: input.discountType,
    discount_value: input.discountValue,
    discount_source_override: input.discountSourceOverride,
    totalEstimate: input.totalEstimate,
    createdAt: new Date().toISOString(),
    status: "pending",
    errorMessage: null,
  };

  await db.transaction("rw", db.pendingSales, db.products, async () => {
    await db.pendingSales.add(sale);
    for (const item of input.items) {
      const product = await db.products.get(item.product_id);
      if (product) {
        await db.products.update(item.product_id, {
          stock: Math.max(0, product.stock - item.quantity),
        });
      }
    }
  });

  return sale;
}

export async function flushPendingSales(): Promise<{ synced: number; conflicts: number }> {
  const db = getOfflineDb();
  const pending = await db.pendingSales.where("status").equals("pending").toArray();
  if (pending.length === 0) return { synced: 0, conflicts: 0 };

  await db.pendingSales
    .where("id")
    .anyOf(pending.map((sale) => sale.id))
    .modify({ status: "syncing" });

  const changes: SyncChangePayload[] = pending.map((sale) => ({
    client_change_id: sale.id,
    entity: "sale",
    operation: "create",
    entity_id: sale.id,
    client_created_at: sale.createdAt,
    payload: {
      payment_method: sale.payment_method,
      customer_name: sale.customer_name,
      items: sale.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
      created_at: sale.createdAt,
      discount_type: sale.discount_type,
      discount_value: sale.discount_value,
      discount_source_override: sale.discount_source_override,
    },
  }));

  let response: Response;
  try {
    response = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: getDeviceId(), changes }),
    });
  } catch {
    await db.pendingSales
      .where("id")
      .anyOf(pending.map((sale) => sale.id))
      .modify({ status: "pending" });
    return { synced: 0, conflicts: 0 };
  }

  if (!response.ok) {
    await db.pendingSales
      .where("id")
      .anyOf(pending.map((sale) => sale.id))
      .modify({ status: "pending" });
    return { synced: 0, conflicts: 0 };
  }

  const data = (await response.json()) as SyncPushResponse;
  let synced = 0;
  let conflicts = 0;

  for (const result of data.results) {
    if (result.status === "accepted" || result.status === "duplicate") {
      await db.pendingSales.update(result.client_change_id, { status: "synced", errorMessage: null });
      synced += 1;
    } else {
      await db.pendingSales.update(result.client_change_id, {
        status: result.status === "conflict" ? "conflict" : "rejected",
        errorMessage: result.error?.detail ?? "No se pudo sincronizar la venta",
      });
      conflicts += 1;
    }
  }

  return { synced, conflicts };
}

export async function runFullSync(): Promise<void> {
  await flushPendingSales();
  await pullCatalog();
}

export async function listConflictedSales(): Promise<PendingSale[]> {
  const db = getOfflineDb();
  const sales = await db.pendingSales.where("status").anyOf("conflict", "rejected").toArray();
  return sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function retryPendingSale(saleId: string): Promise<void> {
  const db = getOfflineDb();
  await db.pendingSales.update(saleId, { status: "pending", errorMessage: null });
  await flushPendingSales();
}

/** Descarta una venta en conflicto/rechazada. Como nunca se creo en el
 * servidor, se revierte el descuento de stock local que se aplico de forma
 * optimista al encolarla (ver `queueSale`), para que el catalogo local no
 * quede mostrando menos stock del que realmente hay. */
export async function discardPendingSale(saleId: string): Promise<void> {
  const db = getOfflineDb();
  await db.transaction("rw", db.pendingSales, db.products, async () => {
    const sale = await db.pendingSales.get(saleId);
    if (!sale) return;
    for (const item of sale.items) {
      const product = await db.products.get(item.product_id);
      if (product) {
        await db.products.update(item.product_id, { stock: product.stock + item.quantity });
      }
    }
    await db.pendingSales.delete(saleId);
  });
}
