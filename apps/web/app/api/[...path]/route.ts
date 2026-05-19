import { proxyRequest } from "@/lib/api/proxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  return proxyRequest(request, await context.params);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, await context.params);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyRequest(request, await context.params);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyRequest(request, await context.params);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyRequest(request, await context.params);
}
