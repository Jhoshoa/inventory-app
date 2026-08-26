import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background px-4 py-10 text-text-body">
      <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 text-center shadow-panel">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-muted text-text-muted">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-text-strong">Sin conexion</h1>
        <p className="mt-2 text-sm text-text-muted">
          No se pudo cargar esta pagina porque no hay conexion a internet y todavia no
          esta disponible en cache en este dispositivo.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Si estabas vendiendo en el punto de venta, las ventas ya realizadas quedaron
          guardadas en este dispositivo y se enviaran automaticamente cuando vuelva la conexion.
        </p>
        <p className="mt-6 text-xs text-text-muted">{BRAND.name}</p>
      </section>
    </main>
  );
}
