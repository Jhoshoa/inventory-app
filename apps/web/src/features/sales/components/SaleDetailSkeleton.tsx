import { PageSection } from "@/components/layout/PageSection";

export function SaleDetailSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando detalle de venta">
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-app-border" />
          <div className="h-4 w-32 animate-pulse rounded bg-app-border" />
          <div className="h-4 w-40 animate-pulse rounded bg-app-border" />
          <div className="h-4 w-24 animate-pulse rounded bg-app-border" />
          <div className="h-8 w-36 animate-pulse rounded bg-app-border" />
        </div>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface shadow-panel">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-b border-app-border px-4 py-3 last:border-b-0"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-app-surface-muted" />
          </div>
        ))}
      </div>
    </PageSection>
  );
}
