export function DashboardSkeleton() {
  return (
    <section className="space-y-6" aria-label="Cargando dashboard">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-app-borderStrong" />
        <div className="h-8 w-full max-w-xs animate-pulse rounded-md bg-app-border" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-app-border" />
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
    </section>
  );
}
