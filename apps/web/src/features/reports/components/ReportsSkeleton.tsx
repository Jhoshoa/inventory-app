/** Mientras carga una sección de Reportes: título, rango y tarjetas. */
export function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando reportes">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Reportes</h1>
      <div className="flex gap-1.5">
        {[52, 64, 52, 68].map((width, index) => (
          <span key={index} className="h-[34px] animate-pulse rounded-full bg-app-surface-muted" style={{ width }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`h-[96px] animate-pulse rounded-card border border-app-border bg-app-surface ${index === 0 ? "col-span-2 md:col-span-1" : ""}`} />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-card border border-app-border bg-app-surface" />
    </div>
  );
}
