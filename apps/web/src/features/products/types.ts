import type { ApiResult } from "@/lib/api/client";

export type ProductStockFilter = "all" | "available" | "low" | "out";
export type ProductSortField = "name" | "stock" | "updated_at" | "price";
export type SortDirection = "asc" | "desc";

export interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  category: string | null;
  qr_code: string | null;
  photo_url: string | null;
  min_stock: number;
  unit: string;
  sku: string | null;
  cost_price: string | null;
  is_active: boolean;
  version: number;
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
  category: string;
  min_stock: string;
  unit: string;
  sku: string;
  cost_price: string;
  qr_code: string;
  photo_url: string;
}

export interface ProductActionState {
  ok: boolean;
  message?: string;
  fieldErrors: Partial<Record<keyof ProductFormValues | "quantity" | "reason" | "confirm", string>>;
}

export type ProductListResult = ApiResult<ProductListResponse>;
export type ProductResult = ApiResult<Product>;
export type StockMovementListResult = ApiResult<StockMovementListResponse>;
