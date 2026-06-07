import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function StoreClosedNotice() {
  return (
    <div className="rounded-lg border border-status-warningBorder bg-status-warningBg p-5 text-status-warning shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5" aria-hidden={true} />
          <div>
            <h2 className="text-base font-semibold">Tienda cerrada</h2>
            <p className="mt-1 text-sm">
              Abre la jornada desde el dashboard para habilitar ventas, movimientos de caja y cierre diario.
            </p>
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Ir al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
