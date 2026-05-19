import type { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
  serializeSession,
} from "./session";
import type { AuthResponse, LoginPayload } from "./types";

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function loginWithBackend(payload: unknown) {
  const loginPayload = parseLoginPayload(payload);
  const result = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: loginPayload,
  });

  if (!result.ok) throw result.error;

  return result.data;
}

export function setAuthCookies(response: NextResponse, auth: AuthResponse) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_TOKEN_COOKIE, auth.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, auth.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(SESSION_COOKIE, serializeSession(auth.user), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
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
