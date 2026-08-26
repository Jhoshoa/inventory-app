import type { ApiResult } from "@/lib/api/client";

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: string;
  discount_type: "percentage" | "fixed" | "product" | null;
  discount_value: string;
  discount_amount: string;
  total: string;
  payment_method: string;
  status: "completed" | "voided" | string;
  business_day_id: string | null;
  business_date: string | null;
  created_by_user_id: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
}

export type SaleStatusFilter = "all" | "completed" | "voided";

export interface SaleSearchParams {
  from_date?: string;
  to_date?: string;
  status: SaleStatusFilter;
  limit: number;
  offset: number;
}

export interface SaleListResponse {
  items: Sale[];
  total: number;
  limit: number;
  offset: number;
  from_date: string;
  to_date: string;
  timezone: string;
  first_business_date: string | null;
}

export interface CreateSalePayload {
  items: Array<{ product_id: string; quantity: number }>;
  payment_method: string;
  device_id?: string;
  customer_name?: string | null;
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: string;
}

export interface SaleActionState {
  ok: boolean;
  message?: string;
  fieldErrors: Partial<
    Record<"items" | "payment_method" | "customer_name" | "discount_value" | "reason", string>
  >;
}

export type SaleListResult = ApiResult<SaleListResponse>;
export type SaleResult = ApiResult<Sale>;
