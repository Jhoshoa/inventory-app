import type { AuthResponse, AuthUser } from "./types";

// Este modulo no importa `next/headers` a proposito: lo usan tanto el middleware
// como los route handlers y las server actions.

export const ACCESS_TOKEN_COOKIE = "inventory_access_token";
export const REFRESH_TOKEN_COOKIE = "inventory_refresh_token";
export const SESSION_COOKIE = "inventory_session";

export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface AuthCookie {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
}

export function serializeSession(user: AuthUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function authCookieOptions(maxAge: number): AuthCookie["options"] {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function authCookies(auth: AuthResponse): AuthCookie[] {
  return [
    {
      name: ACCESS_TOKEN_COOKIE,
      value: auth.access_token,
      options: authCookieOptions(AUTH_COOKIE_MAX_AGE_SECONDS),
    },
    {
      name: REFRESH_TOKEN_COOKIE,
      value: auth.refresh_token,
      options: authCookieOptions(REFRESH_COOKIE_MAX_AGE_SECONDS),
    },
    {
      name: SESSION_COOKIE,
      value: serializeSession(auth.user),
      options: authCookieOptions(AUTH_COOKIE_MAX_AGE_SECONDS),
    },
  ];
}
