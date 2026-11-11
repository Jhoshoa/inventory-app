"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import {
  moneyValue,
  noteValue,
  validateCashMovementType,
  validateMoneyAmount,
  validateStoreDayNote,
  validateVoidReason,
} from "./schemas";
import type { CashMovement, StoreDay, StoreDayActionState } from "./types";

export async function openStoreDayAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };
  const cashError = validateMoneyAmount(formData.get("opening_cash_amount"), "Caja inicial", { allowZero: true });
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
  return { ok: true, message: "Caja abierta", storeDay: result.data, fieldErrors: {} };
}

export async function closeStoreDayAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };
  const skipCashCount = formData.get("skip_cash_count") === "on";
  const cashError = validateMoneyAmount(formData.get("counted_cash_amount"), "Efectivo contado", {
    required: !skipCashCount,
    allowZero: true,
  });
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
  return { ok: true, message: "Caja cerrada", storeDay: result.data, fieldErrors: {} };
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
  return { ok: true, message: "Jornada reabierta", storeDay: result.data, fieldErrors: {} };
}

export async function createCashMovementAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const typeError = validateCashMovementType(formData.get("movement_type"));
  if (typeError) return { ok: false, fieldErrors: { movement_type: typeError } };
  const amountError = validateMoneyAmount(formData.get("amount"), "Monto", { required: true });
  if (amountError) return { ok: false, fieldErrors: { amount: amountError } };
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };

  const token = await getAuthToken();
  const result = await apiRequest<CashMovement>("/cash-movements", {
    method: "POST",
    token: token ?? undefined,
    body: {
      movement_type: formData.get("movement_type"),
      amount: moneyValue(formData, "amount"),
      note: noteValue(formData),
    },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateOperationalPaths();
  return { ok: true, message: "Movimiento registrado", fieldErrors: {} };
}

export async function voidCashMovementAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const movementId = formData.get("movement_id");
  if (typeof movementId !== "string" || !movementId) {
    return { ok: false, message: "Movimiento no válido", fieldErrors: {} };
  }
  const reasonError = validateVoidReason(formData.get("void_reason"));
  if (reasonError) return { ok: false, fieldErrors: { void_reason: reasonError } };

  const token = await getAuthToken();
  const result = await apiRequest<CashMovement>(`/cash-movements/${movementId}/void`, {
    method: "POST",
    token: token ?? undefined,
    body: { void_reason: String(formData.get("void_reason")).trim() },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateOperationalPaths();
  return { ok: true, message: "Movimiento anulado", fieldErrors: {} };
}

function revalidateOperationalPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/caja");
  revalidatePath("/dashboard/mas");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/reports/store-days");
  revalidatePath("/dashboard/reports/cash-movements");
}
