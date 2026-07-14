import { PageSection } from "@/components/layout/PageSection";

export function StoreDayCloseReportSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando reporte de cierre">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-20 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-28 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-32 animate-pulse rounded bg-app-borderStrong" />
        </div>
        <div className="h-7 w-48 animate-pulse rounded bg-app-border" />
        <div className="h-4 w-72 animate-pulse rounded bg-app-border" />
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-app-border" />
              <div className="h-6 w-24 animate-pulse rounded bg-app-surface-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="h-5 w-28 animate-pulse rounded bg-app-border" />
        <div className="mt-4 overflow-hidden rounded-lg border border-app-border">
          <div className="border-b border-app-border bg-app-surface-muted p-3">
            <div className="flex gap-4">
              {["Fecha", "Tipo", "Monto", "Nota"].map((h) => (
                <div key={h} className="h-4 w-20 animate-pulse rounded bg-app-border" />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="flex gap-4 border-b border-app-border p-3 last:border-b-0"
            >
              {[0, 1, 2, 3].map((col) => (
                <div
                  key={col}
                  className={`h-4 animate-pulse rounded bg-app-surface-muted ${
                    col === 3 ? "w-32" : col === 2 ? "w-16" : "w-20"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageSection>
  );
}
