export function MarketingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-16 sm:px-6 lg:px-8" aria-label="Cargando pagina" role="status">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <div className="mx-auto h-4 w-32 animate-pulse rounded bg-app-surface-muted" />
        <div className="mx-auto h-10 w-full animate-pulse rounded bg-app-surface-muted" />
        <div className="mx-auto h-6 w-3/4 animate-pulse rounded bg-app-surface-muted" />
      </div>
      <div className="mx-auto flex max-w-md justify-center gap-3">
        <div className="h-10 w-40 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-app-surface-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-lg border border-app-border bg-app-surface shadow-panel" />
        ))}
      </div>
    </div>
  );
}
