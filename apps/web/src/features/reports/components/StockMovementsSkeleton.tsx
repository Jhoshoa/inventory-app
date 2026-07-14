import { PageSection } from "@/components/layout/PageSection";

export function StockMovementsSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando movimientos de stock">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-20 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-40 animate-pulse rounded bg-app-borderStrong" />
        </div>
        <div className="h-7 w-52 animate-pulse rounded bg-app-border" />
        <div className="h-4 w-64 animate-pulse rounded bg-app-border" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-44 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-9 w-44 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-app-surface-muted" />
      </div>

      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel">
        <div className="border-b border-app-border bg-app-surface-muted p-3">
          <div className="flex gap-4">
            {["Fecha", "Tipo", "Producto", "Cantidad", "Usuario", "Nota"].map((h) => (
              <div key={h} className="h-4 w-20 animate-pulse rounded bg-app-border" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex gap-4 border-b border-app-border p-3 last:border-b-0"
          >
            {[0, 1, 2, 3, 4, 5].map((col) => (
              <div
                key={col}
                className={`h-4 animate-pulse rounded bg-app-surface-muted ${
                  col === 2 ? "w-28" : col === 5 ? "w-36" : "w-20"
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="h-4 w-48 animate-pulse rounded bg-app-border" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-8 w-8 animate-pulse rounded-md bg-app-surface-muted" />
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div>
          <div className="h-5 w-28 animate-pulse rounded bg-app-border" />
          <div className="mt-1 h-4 w-72 animate-pulse rounded bg-app-border" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-1">
              <div className="h-9 w-full animate-pulse rounded-md bg-app-surface-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-app-border" />
            </div>
          ))}
        </div>
      </div>
    </PageSection>
  );
}
