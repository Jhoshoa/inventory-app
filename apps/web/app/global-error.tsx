"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { reportClientError } from "@/lib/observability/client";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  reportClientError(error, { boundary: "global", digest: error.digest ?? "" });

  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-950 antialiased">
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
          <ErrorState
            title="La app encontro un error"
            description="Recarga la pagina o vuelve a iniciar sesion si el problema continua."
            retryLabel="Reintentar"
            onRetry={reset}
            actionHref="/login"
            actionLabel="Ir a login"
          />
        </main>
      </body>
    </html>
  );
}
