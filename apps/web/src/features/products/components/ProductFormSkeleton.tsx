import { PageSection } from "@/components/layout/PageSection";

export function ProductFormSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando formulario de producto">
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-20 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-28 animate-pulse rounded bg-app-borderStrong" />
      </div>

      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-app-border" />
        <div className="h-4 w-72 animate-pulse rounded bg-app-border" />
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-5 shadow-panel">
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-app-borderStrong" />
              <div className="h-9 w-full animate-pulse rounded-md bg-app-surface-muted" />
            </div>
          ))}
        </div>
        <div className="mt-6 h-10 w-40 animate-pulse rounded-md bg-app-surface-muted" />
      </div>
    </PageSection>
  );
}
