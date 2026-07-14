import { PageSection } from "@/components/layout/PageSection";

export function ProductLabelsSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando impresion de etiquetas">
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-20 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-4 w-36 animate-pulse rounded bg-app-borderStrong" />
      </div>

      <div className="space-y-2">
        <div className="h-7 w-52 animate-pulse rounded bg-app-border" />
        <div className="h-4 w-72 animate-pulse rounded bg-app-border" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-64 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-9 w-44 animate-pulse rounded-md bg-app-surface-muted" />
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-app-border px-4 py-3 last:border-b-0"
          >
            <div className="h-5 w-5 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-app-surface-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-app-surface-muted" />
          </div>
        ))}
      </div>
    </PageSection>
  );
}
