import { redirect } from "next/navigation";
import { getBackendApiUrl } from "@/lib/env/server";
import { tryRefreshToken } from "@/lib/auth/session";
import { ApiError, errorFromResponse } from "./errors";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
  timeoutMs?: number;
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

  const { timeoutMs = 20000, token, body, signal: callerSignal, ...fetchOptions } = options;

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

  let result = await doFetch();

  if (!result.ok && result.error.status === 401 && token) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers.set("authorization", `Bearer ${newToken}`);
      options = { ...options, token: newToken };
      result = await doFetch();
    } else {
      redirect("/login");
    }
  }

  return result as ApiResult<T>;
}

function serializeBody(body: unknown) {
  if (body === undefined) return undefined;
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
    return body;
  }
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}
