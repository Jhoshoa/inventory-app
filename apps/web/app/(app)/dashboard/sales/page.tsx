import { EmptyState } from "@/components/ui/EmptyState";

export default function SalesPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Ventas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Historial, detalle y anulaciones llegaran en los sprints de POS.
        </p>
      </div>
      <EmptyState
        title="Ventas pendiente de implementacion"
        description="La base de navegacion ya queda lista para conectar el historial del backend."
      />
    </section>
  );
}
