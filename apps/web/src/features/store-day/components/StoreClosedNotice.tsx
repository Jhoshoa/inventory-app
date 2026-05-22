import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function StoreClosedNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 text-amber-700" aria-hidden={true} />
          <div>
            <h2 className="text-base font-semibold">Tienda cerrada</h2>
            <p className="mt-1 text-sm text-amber-800">
              Un owner debe abrir la jornada desde el dashboard para registrar ventas.
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
