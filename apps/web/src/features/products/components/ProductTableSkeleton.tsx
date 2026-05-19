export function ProductTableSkeleton() {
  return (
    <section className="space-y-4" aria-label="Cargando productos">
      <div className="h-10 w-full animate-pulse rounded-md bg-slate-200" />
      <div className="rounded-lg border border-slate-200 bg-white">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse border-b border-slate-100 last:border-b-0"
          />
        ))}
      </div>
    </section>
  );
}
