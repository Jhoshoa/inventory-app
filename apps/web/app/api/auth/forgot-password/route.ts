import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/client";
import { clientIpFromHeaders } from "@/lib/http/clientIp";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  if (!email) {
    return NextResponse.json({ message: "Escribe tu correo" }, { status: 400 });
  }

  const result = await apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
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
