import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";

export function DashboardSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando dashboard">
      <PageHeader
        eyebrow="Operación"
        title="Dashboard"
        description="Resumen operativo de ventas, productos y alertas de inventario."
        actions={
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-md bg-app-surface-muted" />
            <div className="h-9 w-20 animate-pulse rounded-md bg-app-surface-muted" />
          </div>
        }
      />

      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="flex gap-3">
          <div className="h-10 w-10 animate-pulse rounded-md border border-app-border bg-app-surface-muted" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 animate-pulse rounded bg-app-border" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-app-border" />
            </div>
            <div className="h-4 w-64 animate-pulse rounded bg-app-border" />
            <div className="h-4 w-40 animate-pulse rounded bg-app-border" />
          </div>
        </div>
        <div className="mt-4 h-9 w-full animate-pulse rounded-md bg-app-surface-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-app-border bg-app-surface shadow-panel"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <div className="h-72 animate-pulse rounded-lg border border-app-border bg-app-surface shadow-panel" />
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-lg border border-app-border bg-app-surface shadow-panel" />
          <div className="h-40 animate-pulse rounded-lg border border-app-border bg-app-surface shadow-panel" />
        </div>
      </div>
    </PageSection>
  );
}
