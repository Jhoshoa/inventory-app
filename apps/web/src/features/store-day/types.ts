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
  opening_cash_amount: string | null;
  expected_cash_amount: string | null;
  counted_cash_amount: string | null;
  cash_difference_amount: string | null;
  closing_sales_total: string | null;
  closing_sales_count: number | null;
  closing_voided_sales_count: number | null;
  closing_items_count: number | null;
  closing_cash_sales_total: string | null;
  closing_qr_sales_total: string | null;
  closing_transfer_sales_total: string | null;
  closing_card_sales_total: string | null;
  closing_snapshot_at: string | null;
  sales_total: string | null;
  sales_count: number | null;
  voided_sales_count: number | null;
  timezone: string;
  first_business_date: string | null;
}

export interface StoreDayActionState {
  ok: boolean;
  message?: string;
  fieldErrors: Partial<Record<"note" | "opening_cash_amount" | "counted_cash_amount", string>>;
}

export interface StoreDayClosingPreview {
  business_day_id: string;
  business_date: string;
  status: string;
  opening_cash_amount: string;
  sales_total: string;
  sales_count: number;
  voided_sales_count: number;
  items_count: number;
  cash_sales_total: string;
  qr_sales_total: string;
  transfer_sales_total: string;
  card_sales_total: string;
  expected_cash_amount: string;
}

export interface StoreDayCloseReport extends StoreDayClosingPreview {
  closed_at: string;
  closed_by_user_id: string;
  counted_cash_amount: string | null;
  cash_difference_amount: string | null;
  closing_note: string | null;
  closing_snapshot_at: string;
}

export interface StoreDayCloseReportList {
  items: StoreDayCloseReport[];
  total: number;
  limit: number;
  offset: number;
  from_date: string;
  to_date: string;
}

export interface StoreDayEvent {
  id: string;
  business_day_id: string;
  store_id: string;
  event_type: "open" | "close" | "reopen" | string;
  note: string | null;
  created_by_user_id: string;
  created_at: string;
}

export type StoreDayResult = ApiResult<StoreDay>;
export type StoreDayEventListResult = ApiResult<StoreDayEvent[]>;
export type StoreDayClosingPreviewResult = ApiResult<StoreDayClosingPreview>;
export type StoreDayCloseReportResult = ApiResult<StoreDayCloseReport>;
export type StoreDayCloseReportListResult = ApiResult<StoreDayCloseReportList>;
