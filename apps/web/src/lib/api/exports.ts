import { getAuthToken } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/env/server";

const FORWARDED_CSV_HEADERS = ["content-type", "content-disposition"] as const;

export async function proxyCsvExport(request: Request, exportPath: string) {
  const token = await getAuthToken();

  if (!token) {
    return Response.json(
      { message: "No session", code: "unauthorized" },
      { status: 401 },
    );
  }

  const response = await fetch(buildExportBackendUrl(request.url, exportPath), {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const headers = new Headers();
  for (const header of FORWARDED_CSV_HEADERS) {
    const value = response.headers.get(header);
    if (value) headers.set(header, value);
  }

  if (!response.ok) {
    return Response.json(
      { message: await readErrorMessage(response), code: "export_error" },
      { status: response.status },
    );
  }

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers,
  });
}

export function buildExportBackendUrl(requestUrl: string, exportPath: string) {
  const incoming = new URL(requestUrl);
  const target = new URL(`/api/v1/exports/${exportPath}`, getBackendApiUrl());
  target.search = incoming.search;
  return target;
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") return payload.detail;
    if (typeof payload?.message === "string") return payload.message;
  } catch {
    return "No se pudo exportar el archivo";
  }

  return "No se pudo exportar el archivo";
}
