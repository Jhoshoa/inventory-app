import type { ApiResult } from "@/lib/api/client";

export type InventoryImportStatus =
  | "all"
  | "pending"
  | "processing"
  | "needs_review"
  | "confirmed"
  | "failed"
  | "cancelled";

export type InventoryImportItemStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "imported"
  | "failed";

export interface InventoryImportItem {
  id: string;
  import_id: string;
  status: InventoryImportItemStatus | string;
  row_number: number;
  name: string;
  category: string | null;
  sku: string | null;
  unit: string;
  price: string;
  cost_price: string | null;
  stock: number;
  min_stock: number;
  confidence: string | null;
  raw_data: Record<string, unknown>;
  product_id: string | null;
  error_message: string | null;
}

export interface InventoryImport {
  id: string;
  status: InventoryImportStatus | string;
  source_filename: string | null;
  source_content_type: string | null;
  source_photo_url: string | null;
  raw_text: string | null;
  error_message: string | null;
  items_count: number;
  items: InventoryImportItem[];
}

export interface InventoryImportListResponse {
  items: InventoryImport[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConfirmInventoryImportResponse {
  import_id: string;
  status: string;
  created_products: number;
  failed_items: number;
}

export interface ImportSearchParams {
  status: InventoryImportStatus;
  limit: number;
  offset: number;
}

export interface ImportItemFormValues {
  import_id: string;
  item_id: string;
  status: InventoryImportItemStatus;
  name: string;
  category: string;
  sku: string;
  unit: string;
  price: string;
  cost_price: string;
  stock: string;
  min_stock: string;
}

export interface ImportActionState {
  ok: boolean;
  message?: string;
  fieldErrors: Partial<Record<keyof ImportItemFormValues | "file" | "confirm", string>>;
}

export type InventoryImportListResult = ApiResult<InventoryImportListResponse>;
export type InventoryImportResult = ApiResult<InventoryImport>;
