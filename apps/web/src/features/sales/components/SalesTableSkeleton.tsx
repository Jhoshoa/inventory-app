/** Mientras carga Ventas: título, filtros y filas (misma forma que la lista). */
export function SalesTableSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando ventas">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Ventas</h1>
      <div className="flex flex-wrap gap-1.5">
        {[56, 56, 68, 110].map((width, index) => (
          <span key={index} className="h-[34px] animate-pulse rounded-full bg-app-surface-muted" style={{ width }} />
        ))}
      </div>
      <div className="h-[68px] animate-pulse rounded-card border border-app-border bg-app-surface md:hidden" />
      <div className="overflow-hidden rounded-card border border-app-border bg-app-surface">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3 first:border-t-0">
            <span className="flex flex-col gap-1.5">
              <span className="h-4 w-44 animate-pulse rounded bg-app-surface-muted" />
              <span className="h-3 w-24 animate-pulse rounded bg-app-surface-muted" />
            </span>
            <span className="h-4 w-16 animate-pulse rounded bg-app-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
