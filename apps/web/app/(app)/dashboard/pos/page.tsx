import { Alert } from "@/components/ui/Alert";
import { PosWorkspace } from "@/features/pos/components/PosWorkspace";
import { getCurrentStoreDay } from "@/features/store-day/api";
import { StoreClosedNotice } from "@/features/store-day/components/StoreClosedNotice";

export default async function PosPage() {
  const storeDay = await getCurrentStoreDay();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">POS</h1>
        <p className="mt-1 text-sm text-slate-600">
          Busca productos, arma el carrito y confirma ventas.
        </p>
      </div>
      {!storeDay.ok ? (
        <Alert variant="error">No se pudo cargar el estado de tienda: {storeDay.error.message}</Alert>
      ) : storeDay.data.status !== "open" ? (
        <StoreClosedNotice />
      ) : (
        <PosWorkspace />
      )}
    </section>
  );
}
