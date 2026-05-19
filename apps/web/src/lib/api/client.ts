import { getBackendApiUrl } from "@/lib/env/server";
import { ApiError, errorFromResponse } from "./errors";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  try {
    const response = await fetch(`${getBackendApiUrl()}/api/v1${path}`, {
      ...options,
      headers,
      body: serializeBody(options.body),
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, error: await errorFromResponse(response) };
    }

    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }

    return { ok: true, data: (await response.json()) as T };
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
}

function serializeBody(body: unknown) {
  if (body === undefined) return undefined;
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
    return body;
  }
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}
