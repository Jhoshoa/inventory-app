import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ProductsPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
            Productos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestiona busqueda, stock y codigos QR de tu catalogo.
          </p>
        </div>
        <Button>
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          Nuevo producto
        </Button>
      </div>

      <EmptyState
        title="Todavia no hay productos"
        description="Cuando implementemos el CRUD, esta vista mostrara una tabla paginada con filtros y acciones de stock."
        actionLabel="Preparado para Sprint 2"
      />
    </section>
  );
}
