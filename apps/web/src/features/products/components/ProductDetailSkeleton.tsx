import { PageSection } from "@/components/layout/PageSection";

export function ProductDetailSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando detalle del producto">
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="flex gap-4">
          <div className="h-40 w-40 animate-pulse rounded-lg bg-app-surface-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-64 animate-pulse rounded bg-app-border" />
            <div className="h-4 w-32 animate-pulse rounded bg-app-border" />
            <div className="h-8 w-28 animate-pulse rounded bg-app-border" />
            <div className="flex gap-4">
              <div className="h-4 w-20 animate-pulse rounded bg-app-border" />
              <div className="h-4 w-20 animate-pulse rounded bg-app-border" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface shadow-panel">
        <div className="border-b border-app-border p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-app-border" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-app-border px-4 py-3 last:border-b-0"
          >
            <div className="h-4 w-32 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-app-surface-muted" />
          </div>
        ))}
      </div>
    </PageSection>
  );
}
