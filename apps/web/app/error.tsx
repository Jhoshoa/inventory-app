"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { reportClientError } from "@/lib/observability/client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  reportClientError(error, { boundary: "root", digest: error.digest ?? "" });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <ErrorState
        title="No se pudo cargar la app"
        description="Ocurrio un error inesperado en la interfaz."
        retryLabel="Reintentar"
        onRetry={reset}
        actionHref="/login"
        actionLabel="Ir a login"
      />
    </main>
  );
}
