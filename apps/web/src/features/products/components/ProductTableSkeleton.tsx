export function ProductTableSkeleton() {
  return (
    <section className="space-y-4" aria-label="Cargando productos">
      <div className="h-10 w-full animate-pulse rounded-md bg-app-surface-muted" />
      <div className="rounded-lg border border-app-border bg-app-surface">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse border-b border-app-border last:border-b-0"
          />
        ))}
      </div>
    </section>
  );
}
