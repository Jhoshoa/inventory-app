import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";

// 404 dentro del panel (tablero P14): con la barra y el menú, y accesos a Productos e Inicio.
export default function DashboardNotFound() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-card border border-app-border bg-app-surface px-6 py-12 text-center">
      <SearchX className="h-8 w-8 text-text-muted" aria-hidden="true" />
      <h1 className="text-xl font-extrabold text-text-strong">No encontramos esta página</h1>
      <p className="max-w-md text-sm text-text-muted">
        El enlace puede estar mal escrito o la página cambió de lugar.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/dashboard">Ir a Inicio</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/products">Ver productos</Link>
        </Button>
      </div>
    </section>
  );
}
