import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { setAuthCookies } from "@/lib/auth/server";
import { getBackendApiUrl } from "@/lib/env/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const res = await fetch(`${getBackendApiUrl()}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Error al registrarse" }));
      return NextResponse.json(
        { message: err.message || "Error al registrarse", code: "registration_error" },
        { status: res.status },
      );
    }

    const data = await res.json();

    if (data.success) {
      return NextResponse.json({ success: true, message: data.message });
    }

    const response = NextResponse.json({ user: data.user });
    setAuthCookies(response, data);

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, code: error.code, details: error.details },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { message: "No se pudo crear la cuenta" },
      { status: 500 },
    );
  }
}
