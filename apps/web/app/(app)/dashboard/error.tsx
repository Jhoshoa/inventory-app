"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { reportClientError } from "@/lib/observability/client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  reportClientError(error, { boundary: "dashboard", digest: error.digest ?? "" });

  return (
    <ErrorState
      title="No se pudo cargar esta seccion"
      description="La operacion fallo dentro del panel. Intenta nuevamente."
      retryLabel="Reintentar"
      onRetry={reset}
    />
  );
}
