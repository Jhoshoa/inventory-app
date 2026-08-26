"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { reportClientError } from "@/lib/observability/client";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  reportClientError(error, { boundary: "marketing", digest: error.digest ?? "" });

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-10">
      <ErrorState
        title="No se pudo cargar esta pagina"
        description="Ocurrio un error inesperado. Intenta nuevamente en unos segundos."
        retryLabel="Reintentar"
        onRetry={reset}
        actionHref="/"
        actionLabel="Ir al inicio"
      />
    </div>
  );
}
