import { getAuthToken } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/env/server";

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"] as const;
const FORWARDED_RESPONSE_HEADERS = ["content-type"] as const;

export async function proxyRequest(
  request: Request,
  params: { path: string[] },
) {
  const target = buildBackendUrl(request.url, params.path);
  const headers = await buildProxyHeaders(request.headers);
  const body = await getProxyBody(request);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

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

async function getProxyBody(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  return request.arrayBuffer();
}
