import { getAuthToken } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/env/server";

export async function proxyInventoryImportUpload(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return Response.json({ message: "No session", code: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const response = await fetch(new URL("/api/v1/inventory-imports/from-photo", getBackendApiUrl()), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: formData,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type");
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers,
  });
}
