import type { SaleActionState } from "@/features/sales/types";

export interface PosProduct {
  id: string;
  name: string;
  price: string;
  stock: number;
  unit: string;
  qr_code: string | null;
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
  | { type: "remove"; productId: string }
  | { type: "clear" };

export type CheckoutActionState = SaleActionState;
