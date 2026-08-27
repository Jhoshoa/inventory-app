function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-app-surface-muted ${className}`} />;
}

export default function StorefrontProductLoading() {
  return (
    <div className="space-y-4">
      <Pulse className="h-4 w-40" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Pulse className="aspect-square w-full" />
        <div className="space-y-4">
          <Pulse className="h-8 w-3/4" />
          <Pulse className="h-9 w-32" />
          <Pulse className="h-10 w-48 rounded-full" />
        </div>
      </div>
    </div>
  );
}
