/** Mientras carga la página de la venta (misma forma que el detalle). */
export function SaleDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3" aria-busy="true" aria-label="Cargando venta">
      <div className="flex items-center gap-3 py-1">
        <span className="h-9 w-9 animate-pulse rounded-control bg-app-surface-muted" />
        <span className="flex flex-1 flex-col gap-1.5">
          <span className="h-5 w-40 animate-pulse rounded bg-app-surface-muted" />
          <span className="h-3 w-28 animate-pulse rounded bg-app-surface-muted" />
        </span>
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-app-border bg-app-surface p-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex justify-between">
            <span className="h-4 w-48 animate-pulse rounded bg-app-surface-muted" />
            <span className="h-4 w-14 animate-pulse rounded bg-app-surface-muted" />
          </div>
        ))}
        <span className="ml-auto h-6 w-28 animate-pulse rounded bg-app-surface-muted" />
      </div>
      <div className="h-24 animate-pulse rounded-card border border-app-border bg-app-surface" />
    </div>
  );
}
