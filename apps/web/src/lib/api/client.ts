import { headers as requestHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getBackendApiUrl } from "@/lib/env/server";
import { clientIpFromHeaders } from "@/lib/http/clientIp";
import { ApiError, errorFromResponse } from "./errors";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
  timeoutMs?: number;
  /**
   * IP del visitante que se reenvia al backend (para sus rate limiters).
   * Si se omite se toma de la peticion en curso; `null` desactiva el reenvio.
   */
  clientIp?: string | null;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("content-type") && !(options.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  const {
    timeoutMs = 20000,
    token,
    body,
    signal: callerSignal,
    clientIp,
    ...fetchOptions
  } = options;

  // Sin esto el backend ve siempre la IP del contenedor web y sus limites por
  // IP (login, formularios publicos...) se comparten entre todos los usuarios.
  const forwardedIp = await resolveClientIp(clientIp);
  if (forwardedIp && !headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", forwardedIp);
  }

  const doFetch = async (): Promise<ApiResult<unknown>> => {
    try {
      const response = await fetch(`${getBackendApiUrl()}/api/v1${path}`, {
        ...fetchOptions,
        headers,
        body: serializeBody(body),
        cache: "no-store",
        signal: callerSignal ?? AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        return { ok: false, error: await errorFromResponse(response) };
      }

      if (response.status === 204) {
        return { ok: true, data: undefined };
      }

      return { ok: true, data: await response.json() };
    } catch (error) {
      return {
        ok: false,
        error: new ApiError({
          status: 0,
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error",
          details: error,
        }),
      };
    }
  };

  const result = await doFetch();

  // La renovacion de la sesion la hace el middleware antes de que la peticion
  // llegue aca (y es el unico que puede guardar las cookies nuevas). Un 401 con
  // token a esta altura significa sesion invalida o revocada.
  if (!result.ok && result.error.status === 401 && token) {
    redirect("/login?session=expired");
  }

  return result as ApiResult<T>;
}

async function resolveClientIp(explicit: string | null | undefined) {
  if (explicit !== undefined) return explicit;

  try {
    return clientIpFromHeaders(await requestHeaders());
  } catch (error) {
    // Fuera de una peticion (tests, build) no hay IP que reenviar. Los errores
    // con que Next marca una pagina como dinamica se relanzan: no son nuestros.
    if (isNextControlFlowError(error)) throw error;
    return null;
  }
}

function isNextControlFlowError(error: unknown) {
  const digest = typeof error === "object" && error !== null && "digest" in error
    ? String((error as { digest: unknown }).digest)
    : "";
  return digest.includes("DYNAMIC_SERVER_USAGE") || digest.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING");
}

function serializeBody(body: unknown) {
  if (body === undefined) return undefined;
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
    return body;
  }
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}
