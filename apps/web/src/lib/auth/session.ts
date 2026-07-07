import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser, UserRole } from "./types";

export const ACCESS_TOKEN_COOKIE = "inventory_access_token";
export const REFRESH_TOKEN_COOKIE = "inventory_refresh_token";
export const SESSION_COOKIE = "inventory_session";

export interface Session {
  userId: string;
  email: string;
  storeId: string | null;
  storeName: string;
  fullName: string | null;
  role: UserRole;
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;

  if (!rawSession) return null;

  try {
    return sessionFromUser(JSON.parse(Buffer.from(rawSession, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

export async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8001";
    const res = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token as string;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function serializeSession(user: AuthUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

function sessionFromUser(user: AuthUser): Session {
  return {
    userId: user.id,
    email: user.email,
    storeId: user.store_id ?? null,
    storeName: user.store_name ?? "Mi tienda",
    fullName: user.full_name ?? null,
    role: user.role ?? "cashier",
  };
}
