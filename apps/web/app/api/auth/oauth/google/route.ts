import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/env/server";

export async function POST() {
  const res = await fetch(`${getBackendApiUrl()}/api/v1/auth/oauth/google`, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Error al iniciar OAuth" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
