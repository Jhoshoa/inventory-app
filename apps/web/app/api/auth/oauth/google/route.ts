import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/env/server";
import { clientIpFromHeaders, forwardedForHeaders } from "@/lib/http/clientIp";

export async function POST(request: Request) {
  const res = await fetch(`${getBackendApiUrl()}/api/v1/auth/oauth/google`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...forwardedForHeaders(clientIpFromHeaders(request.headers)),
    },
  });

  if (!res.ok) {
    return NextResponse.json({ message: "No se pudo entrar con Google. Intenta de nuevo." }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
