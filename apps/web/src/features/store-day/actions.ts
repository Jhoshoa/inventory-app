"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { noteValue, validateStoreDayNote } from "./schemas";
import type { StoreDay, StoreDayActionState } from "./types";

export async function openStoreDayAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };

  const token = await getAuthToken();
  const result = await apiRequest<StoreDay>("/store-day/open", {
    method: "POST",
    token: token ?? undefined,
    body: { opening_note: noteValue(formData) },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateOperationalPaths();
  return { ok: true, message: "Tienda abierta", fieldErrors: {} };
}

export async function closeStoreDayAction(
  _previousState: StoreDayActionState,
  formData: FormData,
): Promise<StoreDayActionState> {
  const noteError = validateStoreDayNote(formData.get("note"));
  if (noteError) return { ok: false, fieldErrors: { note: noteError } };

  const token = await getAuthToken();
  const result = await apiRequest<StoreDay>("/store-day/close", {
    method: "POST",
    token: token ?? undefined,
    body: { closing_note: noteValue(formData) },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateOperationalPaths();
  return { ok: true, message: "Tienda cerrada", fieldErrors: {} };
}

function revalidateOperationalPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/sales");
}
