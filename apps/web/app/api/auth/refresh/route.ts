import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/env/server";
import { setAuthCookies } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json({ message: "refresh_token requerido" }, { status: 400 });
    }

    const res = await fetch(`${getBackendApiUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });

    if (!res.ok) {
      return NextResponse.json({ message: "No se pudo renovar la sesion" }, { status: 401 });
    }

    const data = await res.json();
    const response = NextResponse.json({ user: data.user });
    setAuthCookies(response, data);

    return response;
  } catch {
    return NextResponse.json({ message: "Error al renovar sesion" }, { status: 500 });
  }
}
