/** Mientras cargan los pedidos: título, pestañas y tarjetas (misma forma que la lista). */
export default function LoadingStorefrontRequests() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando pedidos">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Pedidos</h1>
      <div className="flex gap-1.5">
        {[112, 108, 84].map((width, index) => (
          <span key={index} className="h-[34px] animate-pulse rounded-full bg-app-surface-muted" style={{ width }} />
        ))}
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-card border border-app-border bg-app-surface px-4 py-3">
          <span className="h-4 w-40 animate-pulse rounded bg-app-surface-muted" />
          <span className="h-3 w-56 animate-pulse rounded bg-app-surface-muted" />
        </div>
      ))}
    </div>
  );
}
