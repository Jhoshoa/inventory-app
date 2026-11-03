import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies } from "@/lib/auth/server";
import { getBackendApiUrl } from "@/lib/env/server";
import { clientIpFromHeaders, forwardedForHeaders } from "@/lib/http/clientIp";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // Revocar la sesion en Supabase es best-effort: las cookies se borran igual,
  // y un backend lento o caido no debe dejar al usuario sin poder salir.
  if (token) {
    try {
      await fetch(`${getBackendApiUrl()}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          ...forwardedForHeaders(clientIpFromHeaders(request.headers)),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // se ignora a proposito
    }
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
