import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({
  title = "Algo salio mal",
  description = "No se pudo completar la operacion. Intenta nuevamente.",
  retryLabel,
  onRetry,
  actionHref = "/dashboard",
  actionLabel = "Volver al dashboard",
}: {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="rounded-lg border border-status-dangerBorder bg-status-dangerBg p-6" role="alert">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <AlertTriangle className="h-6 w-6 text-status-danger" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-status-danger">{title}</h1>
          <p className="mt-1 text-sm text-status-danger">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && retryLabel ? (
              <Button variant="danger" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
            <Button variant="secondary" asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
