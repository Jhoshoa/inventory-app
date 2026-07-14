import { PageSection } from "@/components/layout/PageSection";

export function StoreDayReportsSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando cierres diarios">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-20 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-28 animate-pulse rounded bg-app-borderStrong" />
        </div>
        <div className="h-7 w-40 animate-pulse rounded bg-app-border" />
        <div className="h-4 w-64 animate-pulse rounded bg-app-border" />
      </div>

      <div className="flex gap-2">
        <div className="h-9 w-44 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-app-surface-muted" />
      </div>

      <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel">
        <div className="border-b border-app-border bg-app-surface-muted p-3">
          <div className="flex gap-4">
            {["Fecha", "Ventas", "Caja", "Diferencia", "Estado"].map((h) => (
              <div key={h} className="h-4 w-20 animate-pulse rounded bg-app-border" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex gap-4 border-b border-app-border p-3 last:border-b-0"
          >
            {[0, 1, 2, 3, 4].map((col) => (
              <div
                key={col}
                className={`h-4 animate-pulse rounded bg-app-surface-muted ${
                  col === 0 ? "w-24" : col === 4 ? "w-16" : "w-20"
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
    </PageSection>
  );
}
