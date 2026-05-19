import { Alert } from "@/components/ui/Alert";
import { listSales } from "@/features/sales/api";
import { SalesTable } from "@/features/sales/components/SalesTable";

export default async function SalesPage() {
  const sales = await listSales();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Ventas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Historial de ventas registradas en la tienda.
        </p>
      </div>
      {!sales.ok ? (
        <Alert variant="error">No se pudieron cargar ventas: {sales.error.message}</Alert>
      ) : (
        <SalesTable sales={sales.data} />
      )}
    </section>
  );
}
