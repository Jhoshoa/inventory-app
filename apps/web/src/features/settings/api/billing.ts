import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

export interface BillingStatus {
  subscription_status: string;
  access_status: string;
  trial_expires_at: string | null;
  days_until_trial_ends: number | null;
  next_billing_date: string | null;
  days_until_next_billing: number | null;
  grace_days_remaining: number | null;
  is_trial: boolean;
  is_expired: boolean;
  should_warn: boolean;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const token = await getAuthToken();
  const result = await apiRequest<BillingStatus>("/billing/status", {
    method: "GET",
    token: token ?? undefined,
  });
  if (!result.ok) throw result.error;
  return result.data;
}
