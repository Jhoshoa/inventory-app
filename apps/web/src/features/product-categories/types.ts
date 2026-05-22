import type { ApiResult } from "@/lib/api/client";

export interface ProductCategory {
  id: string;
  name: string;
  sku_prefix: string;
  next_sku_number: number;
  is_active: boolean;
}

export interface ProductCategoryListResponse {
  items: ProductCategory[];
}

export interface ProductCategoryFormValues {
  name: string;
  sku_prefix: string;
}

export interface ProductCategoryActionState {
  ok: boolean;
  message?: string;
  category?: ProductCategory;
  fieldErrors: Partial<Record<keyof ProductCategoryFormValues | "category_id", string>>;
}

export type ProductCategoryListResult = ApiResult<ProductCategoryListResponse>;
