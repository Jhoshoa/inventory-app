export function reportClientError(error: unknown, context?: Record<string, string>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[client-error]", { error, context });
  }
}
