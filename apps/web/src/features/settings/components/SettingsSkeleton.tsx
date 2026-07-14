import { PageSection } from "@/components/layout/PageSection";

export function SettingsSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando ajustes">
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="flex gap-3">
          <div className="h-10 w-10 animate-pulse rounded-md bg-app-surface-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-app-border" />
            <div className="h-4 w-64 animate-pulse rounded bg-app-border" />
            <div className="h-4 w-40 animate-pulse rounded bg-app-border" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-9 w-full animate-pulse rounded-md bg-app-surface-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-app-surface-muted" />
        </div>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="h-5 w-40 animate-pulse rounded bg-app-border" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded bg-app-surface-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-36 animate-pulse rounded bg-app-border" />
                <div className="h-3 w-48 animate-pulse rounded bg-app-border" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="h-5 w-36 animate-pulse rounded bg-app-border" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 w-full animate-pulse rounded bg-app-surface-muted" />
          ))}
          <div className="h-9 w-32 animate-pulse rounded-md bg-app-surface-muted" />
        </div>
      </div>
    </PageSection>
  );
}
