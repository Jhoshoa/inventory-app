export const DEFAULT_BACKEND_API_PORT = "8001";
export const DEFAULT_BACKEND_API_URL = `http://localhost:${DEFAULT_BACKEND_API_PORT}`;

export function getBackendApiUrl() {
  return normalizeBaseUrl(process.env.BACKEND_API_URL) ?? DEFAULT_BACKEND_API_URL;
}

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
}
