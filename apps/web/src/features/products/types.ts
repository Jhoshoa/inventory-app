import type { ApiResult } from "@/lib/api/client";
import type { ProductLocation } from "@/features/store-locations/types";

export type ProductStockFilter = "all" | "available" | "low" | "out" | "expiring";
export type ProductSortField = "name" | "stock" | "updated_at" | "price";
export type SortDirection = "asc" | "desc";

export type ProductDiscountType = "percentage" | "fixed";

export interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  category_id: string | null;
  category: string | null;
  qr_code: string | null;
  photo_url: string | null;
  min_stock: number;
  unit: string;
  sku: string | null;
  cost_price: string | null;
  is_active: boolean;
  version: number;
  discount_type: ProductDiscountType | null;
  discount_value: string;
  discount_ends_at: string | null;
  effective_price: string;
  /** Donde esta en la tienda (puede faltar en respuestas viejas). */
  locations?: ProductLocation[];
  /** Lote con unidades que vence antes (YYYY-MM-DD). Solo viene en la lista. */
  next_expiry?: string | null;
}

export type ProductBatchStatus = "ok" | "expiring" | "expired" | "depleted";

/** Lote con vencimiento. days_left y status se calculan con la fecha de la tienda. */
export interface ProductBatch {
  id: string;
  product_id: string;
  expires_on: string;
  alert_days: number;
  quantity_initial: number;
  quantity_remaining: number;
  created_at: string;
  days_left: number;
  status: ProductBatchStatus;
  product_name: string | null;
  product_unit: string | null;
}

export interface ProductBatchListResponse {
  items: ProductBatch[];
  untracked_quantity: number;
  today: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
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

export interface ProductSearchParams {
  q?: string;
  category?: string;
  category_id?: string;
  stock: ProductStockFilter;
  limit: number;
  offset: number;
  sort: ProductSortField;
  direction: SortDirection;
}

export interface ProductFormValues {
  name: string;
  price: string;
  stock: string;
  category_id: string;
  category: string;
  min_stock: string;
  unit: string;
  sku: string;
  cost_price: string;
  qr_code: string;
  photo_url: string;
  discount_type: ProductDiscountType | "";
  discount_value: string;
  discount_ends_at: string;
  expires_on: string;
  alert_days: string;
}

export interface ProductActionState {
  ok: boolean;
  message?: string;
  values?: ProductFormValues;
  fieldErrors: Partial<
    Record<keyof ProductFormValues | "quantity" | "reason" | "confirm" | "batch_id", string>
  >;
}

export type ProductListResult = ApiResult<ProductListResponse>;
export type ProductResult = ApiResult<Product>;
export type StockMovementListResult = ApiResult<StockMovementListResponse>;
export type ProductBatchListResult = ApiResult<ProductBatchListResponse>;

export type ImportJobStatus = "validating" | "inserting" | "completed";

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  total_rows: number;
  imported_count: number;
  error_count: number;
  errors: RowError[];
  filename: string;
  created_at: string;
  completed_at: string | null;
}

export interface ImportJobListResponse {
  items: ImportJob[];
}
