"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { moneyValue, noteValue, validateMoneyAmount, validateStoreDayNote } from "./schemas";
import type { StoreDay, StoreDayActionState } from "./types";

export async function openStoreDayAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };
  const cashError = validateMoneyAmount(formData.get("opening_cash_amount"), "Caja inicial");
  if (cashError) return { ok: false, fieldErrors: { opening_cash_amount: cashError } };

  const token = await getAuthToken();
  const result = await apiRequest<StoreDay>("/store-day/open", {
    method: "POST",
    token: token ?? undefined,
    body: {
      opening_note: noteValue(formData),
      opening_cash_amount: moneyValue(formData, "opening_cash_amount"),
    },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateOperationalPaths();
  redirect("/dashboard/settings");
}

export async function closeStoreDayAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };
  const skipCashCount = formData.get("skip_cash_count") === "on";
  const cashError = validateMoneyAmount(formData.get("counted_cash_amount"), "Efectivo contado", !skipCashCount);
  if (cashError) return { ok: false, fieldErrors: { counted_cash_amount: cashError } };

  const token = await getAuthToken();
  const result = await apiRequest<StoreDay>("/store-day/close", {
    method: "POST",
    token: token ?? undefined,
    body: {
      closing_note: noteValue(formData),
      counted_cash_amount: skipCashCount ? null : moneyValue(formData, "counted_cash_amount"),
      skip_cash_count: skipCashCount,
    },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateOperationalPaths();
  redirect("/dashboard/settings");
}

export async function reopenStoreDayAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };

  const token = await getAuthToken();
  const result = await apiRequest<StoreDay>("/store-day/reopen", {
    method: "POST",
    token: token ?? undefined,
    body: { opening_note: noteValue(formData) },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateOperationalPaths();
  redirect("/dashboard/settings");
}

function revalidateOperationalPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/reports/store-days");
}
