import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/client";
import { clientIpFromHeaders } from "@/lib/http/clientIp";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const accessToken = typeof payload?.access_token === "string" ? payload.access_token : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  if (!accessToken || !password) {
    return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });
  }

  const result = await apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: { access_token: accessToken, password },
    clientIp: clientIpFromHeaders(request.headers),
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.error.message },
      { status: result.error.status || 503 },
    );
  }

  return NextResponse.json(result.data);
}
