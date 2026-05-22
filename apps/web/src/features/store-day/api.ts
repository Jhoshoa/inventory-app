import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { StoreDay, StoreDayEvent, StoreDayEventListResult, StoreDayResult } from "./types";

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
    sales_total: null,
    sales_count: null,
    voided_sales_count: null,
    timezone: "America/La_Paz",
    first_business_date: null,
  };
}
