import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { loginWithBackend, setAuthCookies } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const auth = await loginWithBackend(payload);
    const response = NextResponse.json({ user: auth.user });

    setAuthCookies(response, auth);

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, code: error.code, details: error.details },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { message: "No se pudo iniciar sesion" },
      { status: 500 },
    );
  }
}
