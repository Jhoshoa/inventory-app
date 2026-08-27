import type { ApiResult } from "@/lib/api/client";

export type StorefrontRequestStatus = "pending" | "contacted" | "closed";

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
