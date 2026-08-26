"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiRequest } from "@/lib/api/client";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
  getAuthToken,
  serializeSession,
} from "@/lib/auth/session";
import type { AuthResponse } from "@/lib/auth/types";
import { validateAcceptInvitationForm, validateInviteCashierForm } from "./schemas";
import type {
  AcceptInvitationFormValues,
  AcceptInvitationState,
  InviteCashierFormValues,
  InviteCashierState,
  UserActionState,
  UserInvitationCreated,
  UserResponse,
  UserRoleValue,
} from "./types";

export async function inviteCashierAction(
  _previousState: InviteCashierState,
  formData: FormData,
): Promise<InviteCashierState> {
  const rawEmail = formData.get("email");
  const rawRole = formData.get("role");

  const values: InviteCashierFormValues = {
    email: (typeof rawEmail === "string" ? rawEmail : "").trim(),
    role: rawRole === "owner" ? "owner" : "cashier",
  };

  const fieldErrors = validateInviteCashierForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida", fieldErrors: {} };

  const result = await apiRequest<UserInvitationCreated>("/user-invitations", {
    method: "POST",
    token,
    body: { email: values.email, role: values.role },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  revalidatePath("/dashboard/settings");
  return {
    ok: true,
    message: `Invitacion enviada a ${values.email}`,
    devInviteUrl: result.data.dev_invite_url ?? null,
    fieldErrors: {},
  };
}

export async function revokeInvitationAction(invitationId: string): Promise<UserActionState> {
  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida" };

  const result = await apiRequest(`/user-invitations/${invitationId}/revoke`, {
    method: "POST",
    token,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Invitacion revocada" };
}

export async function resendInvitationAction(invitationId: string): Promise<UserActionState> {
  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida" };

  const result = await apiRequest<UserInvitationCreated>(`/user-invitations/${invitationId}/resend`, {
    method: "POST",
    token,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Invitacion reenviada" };
}

export async function updateUserRoleAction(userId: string, role: UserRoleValue): Promise<UserActionState> {
  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida" };

  const result = await apiRequest<UserResponse>(`/users/${userId}/role`, {
    method: "PATCH",
    token,
    body: { role },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Rol actualizado" };
}

export async function updateUserStatusAction(userId: string, isActive: boolean): Promise<UserActionState> {
  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida" };

  const result = await apiRequest<UserResponse>(`/users/${userId}/status`, {
    method: "PATCH",
    token,
    body: { is_active: isActive },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: isActive ? "Usuario activado" : "Usuario desactivado" };
}

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function acceptInvitationAction(
  token: string,
  _previousState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const rawFullName = formData.get("full_name");
  const rawPassword = formData.get("password");

  const values: AcceptInvitationFormValues = {
    full_name: (typeof rawFullName === "string" ? rawFullName : "").trim(),
    password: typeof rawPassword === "string" ? rawPassword : "",
  };

  const fieldErrors = validateAcceptInvitationForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  if (!token) {
    return { ok: false, message: "Invitacion invalida", fieldErrors: {} };
  }

  const result = await apiRequest<AuthResponse>("/user-invitations/accept", {
    method: "POST",
    body: { token, full_name: values.full_name, password: values.password },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  const secure = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, result.data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, result.data.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  cookieStore.set(SESSION_COOKIE, serializeSession(result.data.user), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  return { ok: true };
}
