export function requestIdFromHeaders(headers: Headers): string | null {
  return headers.get("x-request-id") ?? headers.get("X-Request-ID");
}
