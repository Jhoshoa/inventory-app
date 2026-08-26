import Dexie, { type Table } from "dexie";

export interface OfflineProduct {
  id: string;
  name: string;
  price: string;
  stock: number;
  unit: string;
  qr_code: string | null;
  discount_type: "percentage" | "fixed" | null;
  discount_value: string;
  effective_price: string;
  deleted: boolean;
  serverUpdatedAt: string;
}

export type PendingSaleStatus = "pending" | "syncing" | "synced" | "conflict" | "rejected";

export interface PendingSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
}

export interface PendingSale {
  id: string;
  items: PendingSaleItem[];
  payment_method: string;
  customer_name: string | null;
  discount_type: "percentage" | "fixed" | null;
  discount_value: string;
  discount_source_override: string | null;
  totalEstimate: string;
  createdAt: string;
  status: PendingSaleStatus;
  errorMessage: string | null;
}

export interface SyncMetaRow {
  key: string;
  value: string;
}

class OfflineDatabase extends Dexie {
  products!: Table<OfflineProduct, string>;
  pendingSales!: Table<PendingSale, string>;
  meta!: Table<SyncMetaRow, string>;

  constructor() {
    super("tiendastock-offline");
    this.version(1).stores({
      products: "id, name, qr_code, deleted",
      pendingSales: "id, status, createdAt",
      meta: "key",
    });
  }
}

let instance: OfflineDatabase | null = null;

export function getOfflineDb(): OfflineDatabase {
  if (typeof window === "undefined") {
    throw new Error("La base de datos offline solo esta disponible en el navegador");
  }
  if (!instance) {
    instance = new OfflineDatabase();
  }
  return instance;
}

export const LAST_PULLED_AT_KEY = "lastPulledAt";
