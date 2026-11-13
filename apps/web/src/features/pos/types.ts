import type { ProductLocationSummary } from "@/features/store-locations/types";
import type { Sale, SaleActionState } from "@/features/sales/types";

export interface PosProduct {
  id: string;
  name: string;
  price: string;
  stock: number;
  unit: string;
  qr_code: string | null;
  discount_type: "percentage" | "fixed" | null;
  discount_value: string;
  effective_price: string;
  /** Donde buscarlo en la tienda (opcional: productos guardados antes no la traen). */
  locations?: ProductLocationSummary[];
}

export interface PosProductListResponse {
  items: PosProduct[];
  total: number;
  limit: number;
  offset: number;
}

export interface CartItem {
  product: PosProduct;
  quantity: number;
}

export interface PosCartState {
  items: CartItem[];
}

export type PosCartAction =
  | { type: "add"; product: PosProduct }
  | { type: "increment"; productId: string }
  | { type: "decrement"; productId: string }
  | { type: "setQuantity"; productId: string; quantity: number }
  | { type: "syncProducts"; products: PosProduct[] }
  | { type: "remove"; productId: string }
  | { type: "clear" }
  /** "Deshacer" el último agregado: vuelve la venta a como estaba. */
  | { type: "restore"; items: CartItem[] };

export interface StockConflict {
  product_id: string;
  product_name: string;
  available_stock: number;
  requested_quantity: number;
}

export type CheckoutActionState = SaleActionState & {
  stockConflicts?: StockConflict[];
  refreshedProducts?: PosProduct[];
  /** La venta creada (para "Venta registrada"). */
  sale?: Sale;
};
