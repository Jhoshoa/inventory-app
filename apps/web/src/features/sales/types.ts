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

export interface CreateSalePayload {
  items: Array<{ product_id: string; quantity: number }>;
  payment_method: string;
  device_id?: string;
  customer_name?: string | null;
}

export interface SaleActionState {
  ok: boolean;
  message?: string;
  fieldErrors: Partial<Record<"items" | "payment_method" | "customer_name" | "reason", string>>;
}

export type SaleListResult = ApiResult<Sale[]>;
export type SaleResult = ApiResult<Sale>;
