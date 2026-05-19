import { EmptyState } from "@/components/ui/EmptyState";

export default function ReportsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Reportes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Exportes y metricas operativas se conectaran despues del flujo POS.
        </p>
      </div>
      <EmptyState
        title="Reportes preparados"
        description="Esta ruta queda disponible para ventas, productos y movimientos CSV."
      />
    </section>
  );
}
