import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";

export function PosSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando POS">
      <PageHeader
        eyebrow="Ventas"
        title="POS"
        description="Busca productos, arma el carrito y confirma ventas."
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="space-y-4 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
          <div className="h-10 w-full animate-pulse rounded-md bg-app-surface-muted" />
          <div className="h-72 animate-pulse rounded-lg bg-app-surface-muted" />
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
            <div className="space-y-3">
              <div className="h-5 w-24 animate-pulse rounded bg-app-border" />
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="h-4 w-32 animate-pulse rounded bg-app-surface-muted" />
                  <div className="h-4 w-12 animate-pulse rounded bg-app-surface-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-app-surface-muted" />
                </div>
              ))}
              <div className="border-t border-app-border pt-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 animate-pulse rounded bg-app-border" />
                  <div className="h-6 w-24 animate-pulse rounded bg-app-border" />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
            <div className="space-y-3">
              <div className="h-5 w-32 animate-pulse rounded bg-app-border" />
              <div className="h-10 w-full animate-pulse rounded-md bg-app-surface-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-app-surface-muted" />
            </div>
          </div>
        </aside>
      </div>
    </PageSection>
  );
}
