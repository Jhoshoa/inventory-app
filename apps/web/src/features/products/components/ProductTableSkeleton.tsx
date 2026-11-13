/** Carga de la página Productos: encabezado, filtros y filas esqueleto. */
export function ProductTableSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-busy="true">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <span className="block h-7 w-36 animate-pulse rounded bg-app-surface-muted" />
          <span className="block h-4 w-52 animate-pulse rounded bg-app-surface-muted" />
        </div>
        <span className="h-11 w-11 animate-pulse rounded-control bg-app-surface-muted sm:w-40" />
      </div>
      <span className="block h-control animate-pulse rounded-control bg-app-surface-muted" />
      <div className="flex gap-2">
        {[64, 96, 96, 80].map((width, index) => (
          <span key={index} style={{ width }} className="block h-[34px] animate-pulse rounded-full bg-app-surface-muted" />
        ))}
      </div>
      <ProductListSkeleton owner={false} />
    </div>
  );
}

export function ProductListSkeleton({ owner }: { owner: boolean }) {
  const rows = Array.from({ length: 6 }, (_, index) => index);
  return (
    <div aria-busy="true" aria-label="Cargando productos">
      <ul className="flex flex-col gap-2.5 md:hidden">
        {rows.map((row) => (
          <li key={row} className="flex items-center gap-3 rounded-[14px] border border-app-border bg-app-surface p-2.5">
            <span className="h-[52px] w-[52px] animate-pulse rounded-[10px] bg-app-surface-muted" />
            <span className="flex-1 space-y-2">
              <span className="block h-4 w-2/3 animate-pulse rounded bg-app-surface-muted" />
              <span className="block h-3 w-1/2 animate-pulse rounded bg-app-surface-muted" />
            </span>
            <span className="h-5 w-14 animate-pulse rounded-full bg-app-surface-muted" />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-card border border-app-border bg-app-surface md:block">
        <div className="h-9 bg-app-surface-muted" />
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-3 border-t border-app-border px-3 py-2.5">
            <span className="h-10 w-10 animate-pulse rounded-[10px] bg-app-surface-muted" />
            <span className="flex-1 space-y-2">
              <span className="block h-4 w-48 animate-pulse rounded bg-app-surface-muted" />
              <span className="block h-3 w-32 animate-pulse rounded bg-app-surface-muted" />
            </span>
            <span className="h-5 w-16 animate-pulse rounded-full bg-app-surface-muted" />
            <span className="h-4 w-16 animate-pulse rounded bg-app-surface-muted" />
            {owner ? <span className="h-8 w-28 animate-pulse rounded-control bg-app-surface-muted" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
