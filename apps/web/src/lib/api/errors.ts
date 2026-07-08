export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_error"
  | "server_error"
  | "network_error"
  | "import_error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: unknown;

  constructor({
    status,
    code,
    message,
    details,
  }: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  if (status >= 500) return "server_error";
  return "bad_request";
}

export async function errorFromResponse(response: Response): Promise<ApiError> {
  const details = await readBody(response);
  const message = getErrorMessage(details) ?? response.statusText ?? "Request failed";

  return new ApiError({
    status: response.status,
    code: codeFromStatus(response.status),
    message,
    details,
  });
}

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

function getErrorMessage(details: unknown) {
  if (typeof details === "string" && details.length > 0) return details;
  if (!details || typeof details !== "object") return null;

  const maybeError = details as { detail?: unknown; message?: unknown; error?: unknown };

  if (typeof maybeError.detail === "string") return maybeError.detail;
  if (typeof maybeError.message === "string") return maybeError.message;
  if (typeof maybeError.error === "string") return maybeError.error;

  return null;
}
