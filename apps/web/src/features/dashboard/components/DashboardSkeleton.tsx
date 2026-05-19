export function DashboardSkeleton() {
  return (
    <section className="space-y-6" aria-label="Cargando dashboard">
      <div className="h-14 w-full max-w-md animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </section>
  );
}
