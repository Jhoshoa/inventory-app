const DEFAULT_BACKEND_API_URL = "http://localhost:8000";

export function getBackendApiUrl() {
  return process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_API_URL;
}
