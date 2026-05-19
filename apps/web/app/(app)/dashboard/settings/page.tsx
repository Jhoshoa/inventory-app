import { EmptyState } from "@/components/ui/EmptyState";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Ajustes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configuracion de tienda, usuarios y permisos.
        </p>
      </div>
      <EmptyState
        title="Configuracion pendiente"
        description="La ruta queda protegida y lista para los flujos owner/cashier."
      />
    </section>
  );
}
