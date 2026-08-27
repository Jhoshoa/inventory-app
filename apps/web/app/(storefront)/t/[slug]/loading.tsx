function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-app-surface-muted ${className}`} />;
}

export default function StorefrontCatalogLoading() {
  return (
    <div className="space-y-6">
      <Pulse className="h-10 w-full" />
      <div className="space-y-3">
        <Pulse className="h-5 w-40" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse key={i} className="aspect-square w-40 shrink-0 sm:w-48" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex gap-2 lg:w-56 lg:shrink-0 lg:flex-col">
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-8 w-24 shrink-0 rounded-full lg:w-full lg:rounded-md" />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <Pulse className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Pulse className="aspect-square w-full" />
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
