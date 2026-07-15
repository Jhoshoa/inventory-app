"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken, SESSION_COOKIE, serializeSession } from "@/lib/auth/session";
import { validateStoreForm } from "./schemas";
import type { StoreEditorState, StoreFormValues, StoreResponse } from "./types";

export async function updateStoreAction(
  _previousState: StoreEditorState,
  formData: FormData,
): Promise<StoreEditorState> {
  const rawName = formData.get("name");
  const rawAddress = formData.get("address");
  const rawPhone = formData.get("phone");

  const values: StoreFormValues = {
    name: (typeof rawName === "string" ? rawName : "").trim(),
    address: typeof rawAddress === "string" ? rawAddress.trim() : "",
    phone: typeof rawPhone === "string" ? rawPhone.trim() : "",
  };

  const fieldErrors = validateStoreForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida", fieldErrors: {} };

  const body: Record<string, string> = {};
  body.name = values.name;
  if (values.address) body.address = values.address;
  if (values.phone) body.phone = values.phone;

  const result = await apiRequest<StoreResponse>("/store", {
    method: "PATCH",
    token,
    body,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawSession) {
    try {
      const user = JSON.parse(Buffer.from(rawSession, "base64url").toString("utf8"));
      user.store_name = values.name;
      cookieStore.set(SESSION_COOKIE, serializeSession(user), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    } catch {
      // skip updating session if it can't be parsed
    }
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Tienda actualizada correctamente", fieldErrors: {} };
}
