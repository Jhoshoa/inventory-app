import type { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_COOKIE, authCookies } from "./cookies";
import type { AuthResponse, LoginPayload } from "./types";

export async function loginWithBackend(payload: unknown, clientIp?: string | null) {
  const loginPayload = parseLoginPayload(payload);
  const result = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: loginPayload,
    clientIp,
  });

  if (!result.ok) throw result.error;

  return result.data;
}

export function setAuthCookies(response: NextResponse, auth: AuthResponse) {
  for (const { name, value, options } of authCookies(auth)) {
    response.cookies.set(name, value, options);
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(SESSION_COOKIE);
}

function parseLoginPayload(payload: unknown): LoginPayload {
  if (!payload || typeof payload !== "object") {
    throw new ApiError({
      status: 400,
      code: "bad_request",
      message: "Credenciales invalidas",
    });
  }

  const value = payload as Partial<LoginPayload>;
  if (!value.email || !value.password) {
    throw new ApiError({
      status: 400,
      code: "bad_request",
      message: "Email y password son requeridos",
    });
  }

  return { email: value.email, password: value.password };
}
