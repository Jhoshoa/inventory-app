import type { ApiResult } from "@/lib/api/client";

export type StoreDayStatus = "open" | "closed" | string;

export interface StoreDay {
  id: string | null;
  status: StoreDayStatus;
  business_date: string;
  opened_at: string | null;
  closed_at: string | null;
  opened_by_user_id: string | null;
  closed_by_user_id: string | null;
  opening_note: string | null;
  closing_note: string | null;
  sales_total: string | null;
  sales_count: number | null;
  voided_sales_count: number | null;
  timezone: string;
  first_business_date: string | null;
}

export interface StoreDayActionState {
  ok: boolean;
  message?: string;
  fieldErrors: Partial<Record<"note", string>>;
}

export type StoreDayResult = ApiResult<StoreDay>;
