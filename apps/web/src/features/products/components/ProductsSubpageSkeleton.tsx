/** Carga de Categorías y Lugares en la tienda: encabezado, pestañas y filas. */
export function ProductsSubpageSkeleton() {
  const rows = Array.from({ length: 5 }, (_, index) => index);
  return (
    <div className="flex flex-col gap-3.5" aria-busy="true" aria-label="Cargando">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <span className="block h-7 w-40 animate-pulse rounded bg-app-surface-muted" />
          <span className="block h-4 w-32 animate-pulse rounded bg-app-surface-muted" />
        </div>
        <span className="h-control w-40 animate-pulse rounded-control bg-app-surface-muted max-sm:hidden" />
      </div>
      <span className="block h-10 animate-pulse rounded bg-app-surface-muted max-sm:hidden" />
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <span key={row} className="block h-[60px] animate-pulse rounded-[14px] bg-app-surface-muted" />
        ))}
      </div>
    </div>
  );
}
