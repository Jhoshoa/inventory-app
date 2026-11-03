import { getBackendApiUrl } from "@/lib/env/server";
import { forwardedForHeaders } from "@/lib/http/clientIp";
import type { AuthResponse } from "./types";

/**
 * - ok: sesion renovada, hay que guardar los tokens nuevos en las cookies.
 * - invalid: el refresh token ya no sirve (vencido, usado o revocado): hay que
 *   pedir login de nuevo.
 * - unavailable: el backend o Supabase no respondieron. NO es una sesion
 *   invalida: no hay que cerrarle la sesion al usuario por una caida pasajera.
 */
export type RefreshResult =
  | { status: "ok"; auth: AuthResponse }
  | { status: "invalid" }
  | { status: "unavailable" };

const REFRESH_TIMEOUT_MS = 10_000;
// Supabase rota el refresh token en cada renovacion. Varias peticiones del
// mismo navegador pueden llegar con el token viejo a la vez (el navegador aun
// no recibio las cookies nuevas): se comparte una sola renovacion entre todas
// y se recuerda el resultado unos segundos para las que lleguen un poco despues.
const RECENT_RESULT_TTL_MS = 30_000;
const MAX_RECENT_RESULTS = 200;

const inflight = new Map<string, Promise<RefreshResult>>();
const recent = new Map<string, { auth: AuthResponse; expiresAt: number }>();

export async function refreshAuthSession(
  refreshToken: string,
  options: { clientIp?: string | null } = {},
): Promise<RefreshResult> {
  const cached = recent.get(refreshToken);
  if (cached) {
    if (cached.expiresAt > Date.now()) return { status: "ok", auth: cached.auth };
    recent.delete(refreshToken);
  }

  const pending = inflight.get(refreshToken);
  if (pending) return pending;

  const request = requestRefresh(refreshToken, options.clientIp).finally(() => {
    inflight.delete(refreshToken);
  });
  inflight.set(refreshToken, request);
  return request;
}

async function requestRefresh(
  refreshToken: string,
  clientIp: string | null | undefined,
): Promise<RefreshResult> {
  let response: Response;
  try {
    response = await fetch(`${getBackendApiUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", ...forwardedForHeaders(clientIp) },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
  } catch {
    return { status: "unavailable" };
  }

  if (response.status === 401 || response.status === 403) return { status: "invalid" };
  if (!response.ok) return { status: "unavailable" };

  try {
    const auth = (await response.json()) as AuthResponse;
    if (!auth?.access_token || !auth?.refresh_token) return { status: "unavailable" };
    rememberResult(refreshToken, auth);
    return { status: "ok", auth };
  } catch {
    return { status: "unavailable" };
  }
}

function rememberResult(refreshToken: string, auth: AuthResponse) {
  const now = Date.now();
  for (const [key, entry] of recent) {
    if (entry.expiresAt <= now) recent.delete(key);
  }
  while (recent.size >= MAX_RECENT_RESULTS) {
    const oldest = recent.keys().next().value;
    if (oldest === undefined) break;
    recent.delete(oldest);
  }
  recent.set(refreshToken, { auth, expiresAt: now + RECENT_RESULT_TTL_MS });
}

export function resetRefreshStateForTests() {
  inflight.clear();
  recent.clear();
}
