import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function DataFetchError({
  resource,
  error,
  onRetry,
}: {
  resource: string;
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-status-warningBorder bg-status-warningBg p-4"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-status-warning">
          No se pudo cargar {resource}
        </p>
        <p className="mt-0.5 text-xs text-status-warning/80">
          {error}. Intenta recargar la pagina o verifica tu conexion.
        </p>
        {onRetry ? (
          <Button variant="secondary" className="mt-2 h-8 text-xs" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
