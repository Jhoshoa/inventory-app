import type { NextRequest } from "next/server";
import { refreshSessionIfNeeded } from "@/lib/auth/sessionMiddleware";

export function middleware(request: NextRequest) {
  return refreshSessionIfNeeded(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
  runtime: "nodejs",
};
