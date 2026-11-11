// Esqueleto de Inicio: misma forma que el contenido, nunca una pantalla en blanco (regla 3.4).
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-card bg-[#EEF0F4] ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <Block className="h-4 w-40 rounded" />
        <Block className="h-8 w-32 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Block className="col-span-2 h-[110px] lg:col-span-1" />
        <Block className="h-[110px]" />
        <Block className="h-[110px]" />
        <Block className="h-[110px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block className="h-56" />
        <Block className="h-56" />
      </div>
      <Block className="h-64" />
    </div>
  );
}
