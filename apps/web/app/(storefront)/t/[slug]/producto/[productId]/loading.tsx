function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E4E1D8] ${className}`} />;
}

/** Mientras carga el producto: la misma silueta que la pagina, en el estilo de la plantilla. */
export default function StorefrontProductLoading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 sm:px-6" aria-label="Cargando producto">
      <Pulse className="h-4 w-48" />
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 border-2 border-[#111111] bg-white p-3 md:mt-5 md:grid-cols-2 md:gap-10 md:p-8">
        <Pulse className="aspect-[4/3] max-h-[38vh] w-full border-2 border-[#111111] md:aspect-square md:max-h-none" />
        <div className="space-y-3 md:space-y-4">
          <Pulse className="h-5 w-24" />
          <Pulse className="h-7 w-3/4" />
          <Pulse className="h-8 w-32" />
          <Pulse className="h-12 w-full md:max-w-sm" />
          <Pulse className="h-11 w-full rounded-full md:max-w-sm" />
        </div>
      </div>
    </div>
  );
}
