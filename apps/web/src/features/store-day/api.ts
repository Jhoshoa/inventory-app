import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type {
  StoreDay,
  StoreDayCloseReport,
  StoreDayCloseReportList,
  StoreDayCloseReportListResult,
  StoreDayCloseReportResult,
  StoreDayClosingPreview,
  StoreDayClosingPreviewResult,
  StoreDayEvent,
  StoreDayEventListResult,
  StoreDayResult,
} from "./types";

export async function getCurrentStoreDay(): Promise<StoreDayResult> {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: true,
      data: createClosedStoreDay(),
    };
  }
  return apiRequest<StoreDay>("/store-day/current", { token });
}

export async function getCurrentStoreDayEvents(): Promise<StoreDayEventListResult> {
  const token = await getAuthToken();
  if (!token) return { ok: true, data: [] };
  return apiRequest<StoreDayEvent[]>("/store-day/current/events", { token });
}

export async function getCurrentClosingPreview(): Promise<StoreDayClosingPreviewResult> {
  const token = await getAuthToken();
  if (!token) return { ok: true, data: createEmptyClosingPreview() };
  return apiRequest<StoreDayClosingPreview>("/store-day/current/closing-preview", { token });
}

export async function getCurrentCloseReport(): Promise<StoreDayCloseReportResult> {
  const token = await getAuthToken();
  if (!token) return { ok: true, data: createEmptyCloseReport() };
  return apiRequest<StoreDayCloseReport>("/store-day/current/close-report", { token });
}

export async function getCloseReport(businessDayId: string): Promise<StoreDayCloseReportResult> {
  const token = await getAuthToken();
  if (!token) return { ok: true, data: createEmptyCloseReport() };
  return apiRequest<StoreDayCloseReport>(`/store-day/reports/${businessDayId}`, { token });
}

export async function listCloseReports(params: {
  from_date?: string;
  to_date?: string;
  limit: number;
  offset: number;
}): Promise<StoreDayCloseReportListResult> {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: true,
      data: { items: [], total: 0, limit: params.limit, offset: params.offset, from_date: "", to_date: "" },
    };
  }
  const query = new URLSearchParams();
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  return apiRequest<StoreDayCloseReportList>(`/store-day/reports?${query.toString()}`, { token });
}

export function createClosedStoreDay(): StoreDay {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: null,
    status: "closed",
    business_date: today,
    opened_at: null,
    closed_at: null,
    opened_by_user_id: null,
    closed_by_user_id: null,
    opening_note: null,
    closing_note: null,
    opening_cash_amount: null,
    expected_cash_amount: null,
    counted_cash_amount: null,
    cash_difference_amount: null,
    closing_sales_total: null,
    closing_sales_count: null,
    closing_voided_sales_count: null,
    closing_items_count: null,
    closing_cash_sales_total: null,
    closing_qr_sales_total: null,
    closing_transfer_sales_total: null,
    closing_card_sales_total: null,
    closing_snapshot_at: null,
    sales_total: null,
    sales_count: null,
    voided_sales_count: null,
    timezone: "America/La_Paz",
    first_business_date: null,
  };
}

function createEmptyClosingPreview(): StoreDayClosingPreview {
  const today = new Date().toISOString().slice(0, 10);
  return {
    business_day_id: "",
    business_date: today,
    status: "open",
    opening_cash_amount: "0",
    sales_total: "0",
    sales_count: 0,
    voided_sales_count: 0,
    items_count: 0,
    cash_sales_total: "0",
    qr_sales_total: "0",
    transfer_sales_total: "0",
    card_sales_total: "0",
    expected_cash_amount: "0",
  };
}

function createEmptyCloseReport(): StoreDayCloseReport {
  return {
    ...createEmptyClosingPreview(),
    status: "closed",
    closed_at: new Date().toISOString(),
    closed_by_user_id: "",
    counted_cash_amount: null,
    cash_difference_amount: null,
    closing_note: null,
    closing_snapshot_at: new Date().toISOString(),
  };
}
