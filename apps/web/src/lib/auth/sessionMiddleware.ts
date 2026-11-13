import { NextResponse, type NextRequest } from "next/server";
import { clientIpFromHeaders } from "@/lib/http/clientIp";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
  authCookies,
} from "./cookies";
import { decodeJwtExp } from "./jwt";
import { refreshAuthSession } from "./refresh";

// Se renueva un poco antes de que venza para no mandar al backend un token que
// expira a mitad de camino. Configurable solo para poder probar la renovacion
// real sin esperar a que pase la hora de vida del token.
const REFRESH_LEEWAY_SECONDS = Number(process.env.AUTH_REFRESH_LEEWAY_SECONDS) || 60;

/**
 * Renueva la sesion (access token vencido o por vencer) ANTES de que la
 * peticion llegue a los Server Components / route handlers, que no pueden
 * escribir cookies. Es el unico lugar donde se usa el refresh token.
 */
export async function refreshSessionIfNeeded(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return NextResponse.next();

  if (accessToken) {
    const exp = decodeJwtExp(accessToken);
    // Sin `exp` no es un JWT de Supabase (token de desarrollo): no vence.
    if (exp === null) return NextResponse.next();
    if (exp - Date.now() / 1000 > REFRESH_LEEWAY_SECONDS) return NextResponse.next();
  }

  const result = await refreshAuthSession(refreshToken, {
    clientIp: clientIpFromHeaders(request.headers),
  });

  if (result.status === "unavailable") return NextResponse.next();
  if (result.status === "invalid") return sessionExpired(request);

  // Las cookies nuevas tienen que llegar a los Server Components de ESTA misma
  // peticion (por eso se escriben tambien en `request`) y al navegador (response).
  const cookies = authCookies(result.auth);
  for (const { name, value } of cookies) request.cookies.set(name, value);
  const response = NextResponse.next({ request });
  for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
  return response;
}

function sessionExpired(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const response = isApi
    ? NextResponse.json({ message: "Sesión expirada" }, { status: 401 })
    : NextResponse.redirect(publicUrl(request, "/login?session=expired"));

  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

/**
 * URL absoluta (Next no acepta redirecciones relativas en el middleware) con el
 * host que vio el visitante. Detras de Traefik/Docker `request.url` suele traer
 * el host interno (0.0.0.0:3010), asi que se prefieren las cabeceras del proxy.
 */
function publicUrl(request: NextRequest, pathAndQuery: string) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const origin = host ? `${protocol}://${host}` : request.nextUrl.origin;
  return new URL(pathAndQuery, origin);
}
