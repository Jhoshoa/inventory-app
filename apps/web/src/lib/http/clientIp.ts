import { isIP } from "node:net";

/**
 * IP real del visitante, tal como la deja el proxy de Dokploy (Traefik) en
 * `x-forwarded-for` / `x-real-ip`. Se valida que sea una IP para no reenviar
 * texto arbitrario al backend, que la usa como clave de sus rate limiters.
 */
export function clientIpFromHeaders(headers: Pick<Headers, "get">): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded && isIP(forwarded)) return forwarded;

  const real = headers.get("x-real-ip")?.trim();
  if (real && isIP(real)) return real;

  return null;
}

export function forwardedForHeaders(ip: string | null | undefined): Record<string, string> {
  return ip ? { "x-forwarded-for": ip } : {};
}
