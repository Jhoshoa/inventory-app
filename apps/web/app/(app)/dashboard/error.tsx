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
      title="No se pudo cargar esta sección"
      description="Algo falló al cargar. Intenta de nuevo; el resto del panel sigue funcionando."
      retryLabel="Reintentar"
      onRetry={reset}
    />
  );
}
