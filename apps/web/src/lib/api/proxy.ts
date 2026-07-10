import { getAuthToken, getRefreshToken } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/env/server";

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"] as const;
const FORWARDED_RESPONSE_HEADERS = ["content-type"] as const;

export async function proxyRequest(
  request: Request,
  params: { path: string[] },
) {
  const target = buildBackendUrl(request.url, params.path);
  const headers = await buildProxyHeaders(request.headers);
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : request.body;

  let response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    // @ts-expect-error - duplex is required for streaming body in undici/Node 18+
    duplex: body ? "half" : undefined,
  });

  if (response.status === 401) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      const refreshRes = await fetch(`${getBackendApiUrl()}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        headers.set("authorization", `Bearer ${data.access_token}`);

        const retryBody = request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body;
        response = await fetch(target, {
          method: request.method,
          headers,
          body: retryBody,
          cache: "no-store",
          // @ts-expect-error - duplex: "half" for streaming body
          duplex: retryBody ? "half" : undefined,
        });
      } else {
        return Response.redirect(new URL("/login", request.url));
      }
    } else {
      return Response.redirect(new URL("/login", request.url));
    }
  }

  const responseHeaders = new Headers();
  for (const header of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }

  if (response.status === 204) {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: responseHeaders,
  });
}

export function buildBackendUrl(requestUrl: string, path: string[]) {
  const incoming = new URL(requestUrl);
  const target = new URL(`/api/v1/${path.join("/")}`, getBackendApiUrl());
  target.search = incoming.search;
  return target;
}

async function buildProxyHeaders(source: Headers) {
  const headers = new Headers();

  for (const header of FORWARDED_REQUEST_HEADERS) {
    const value = source.get(header);
    if (value) headers.set(header, value);
  }

  const token = await getAuthToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  return headers;
}


