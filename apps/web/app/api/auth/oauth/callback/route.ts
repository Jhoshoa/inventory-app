import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/env/server";
import { setAuthCookies } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ message: "code requerido" }, { status: 400 });
    }

    const res = await fetch(`${getBackendApiUrl()}/api/v1/auth/oauth/callback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Error en OAuth callback" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    const response = NextResponse.json({ user: data.user });
    setAuthCookies(response, data);

    return response;
  } catch {
    return NextResponse.json({ message: "Error en autenticacion con Google" }, { status: 500 });
  }
}
