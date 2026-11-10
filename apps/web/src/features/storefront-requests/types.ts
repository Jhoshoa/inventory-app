import type { ApiResult } from "@/lib/api/client";

export type StorefrontRequestStatus = "pending" | "contacted" | "closed";

export interface StorefrontRequestItem {
  product_id: string | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface StorefrontRequestResponse {
  id: string;
  product_id: string | null;
  product_name: string;
  customer_name: string;
  customer_phone: string;
  note: string | null;
  status: StorefrontRequestStatus;
  payment_confirmed: boolean;
  created_at: string;
  /** Boleta con varios productos. Vacio en solicitudes viejas de un producto. */
  items: StorefrontRequestItem[];
  total: string | null;
  delivery_method: "pickup" | "delivery" | null;
}

export interface StorefrontRequestListResponse {
  items: StorefrontRequestResponse[];
  total: number;
  pending_count: number;
  limit: number;
  offset: number;
}

export type StorefrontRequestListResult = ApiResult<StorefrontRequestListResponse>;

export type StorefrontRequestActionState = {
  ok: boolean;
  message: string;
};
