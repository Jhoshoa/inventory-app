import type { ApiResult } from "@/lib/api/client";

export type ReportRangePreset = "today" | "7d" | "30d" | "month" | "custom";

export type StockMovementType =
  | "all"
  | "sale"
  | "sale_void"
  | "manual_adjustment"
  | "import"
  | "stock_movement";

export interface ReportSearchParams {
  range: ReportRangePreset;
  from: string;
  to: string;
}

export interface StockMovementSearchParams extends ReportSearchParams {
  product_id?: string;
  type: StockMovementType;
  limit: number;
  offset: number;
}

export interface SalesByPaymentMethod {
  payment_method: string;
  total: string;
  count: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  total: string;
}

export interface SalesReport {
  from_date: string;
  to_date: string;
  total_sales: string;
  sales_count: number;
  items_count: number;
  by_payment_method: SalesByPaymentMethod[];
  top_products: TopProduct[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  sale_id: string | null;
  movement_type: string;
  quantity_delta: number;
  stock_after: number;
  reason: string | null;
  device_id: string | null;
  created_at: string;
}

export interface StockMovementListResponse {
  items: StockMovement[];
  total: number;
  limit: number;
  offset: number;
}

export type SalesReportResult = ApiResult<SalesReport>;
export type StockMovementListResult = ApiResult<StockMovementListResponse>;
