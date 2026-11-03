import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
  serializeSession,
} from "./cookies";
import type { AuthUser, UserRole } from "./types";

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_COOKIE, serializeSession };

export interface Session {
  userId: string;
  email: string;
  storeId: string | null;
  storeName: string;
  fullName: string | null;
  role: UserRole;
  trialExpiresAt: string | null;
  daysUntilTrialEnds: number | null;
  subscriptionStatus: string | null;
  accessStatus: string | null;
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
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

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

function sessionFromUser(user: AuthUser): Session {
  return {
    userId: user.id,
    email: user.email,
    storeId: user.store_id ?? null,
    storeName: user.store_name ?? "Mi tienda",
    fullName: user.full_name ?? null,
    role: user.role ?? "cashier",
    trialExpiresAt: user.trial_expires_at ?? null,
    daysUntilTrialEnds: user.days_until_trial_ends ?? null,
    subscriptionStatus: user.subscription_status ?? null,
    accessStatus: user.access_status ?? null,
  };
}
