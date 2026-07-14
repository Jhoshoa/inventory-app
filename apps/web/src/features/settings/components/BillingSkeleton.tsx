export function BillingSkeleton() {
  return (
    <div className="space-y-6" aria-label="Cargando suscripcion">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-20 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-4 animate-pulse rounded bg-app-borderStrong" />
          <div className="h-4 w-28 animate-pulse rounded bg-app-borderStrong" />
        </div>
        <div className="h-7 w-56 animate-pulse rounded bg-app-border" />
        <div className="h-4 w-72 animate-pulse rounded bg-app-border" />
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 animate-pulse rounded bg-app-border" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-app-surface-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-app-borderStrong" />
                <div className="h-5 w-32 animate-pulse rounded bg-app-surface-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
