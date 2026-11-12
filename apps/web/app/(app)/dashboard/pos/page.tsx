import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { PosClosed } from "@/features/pos/components/PosClosed";
import { PosScreen } from "@/features/pos/components/PosScreen";
import { TOP_PRODUCTS_SHOWN } from "@/features/pos/catalog";
import { getTopSellingProducts } from "@/features/reports/api";
import { parseReportSearchParams } from "@/features/reports/schemas";
import { getStore } from "@/features/settings/api";
import { getCurrentStoreDay } from "@/features/store-day/api";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Vender" };

// Vender (Fase 4, tableros A · POS). La caja tiene que estar abierta.
export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pedido = (await searchParams).pedido;
  const orderId = typeof pedido === "string" && pedido ? pedido : null;
  const session = await requireSession();
  const [storeDay, store, topProducts] = await Promise.all([
    getCurrentStoreDay(),
    getStore().catch(() => null),
    // Más vendidos: los de los últimos 30 días (si falla, se usan los guardados en el equipo).
    getTopSellingProducts(parseReportSearchParams({ range: "30d" })).catch(() => null),
  ]);

  if (!storeDay.ok) return <PosError resource="el estado de la caja" error={storeDay.error.message} />;
  if (storeDay.data.status !== "open") return <PosClosed owner={canOpenCloseStore(session.role)} />;
  if (!store) return <PosError resource="los datos de la tienda" error="No se pudieron leer los descuentos de la tienda" />;

  const topProductIds = topProducts ? topProducts.slice(0, TOP_PRODUCTS_SHOWN).map((item) => item.product_id) : null;

  return (
    <PosScreen
      policy={store}
      storeName={store.name}
      sellerName={session.fullName ?? session.email.split("@")[0]}
      topProductIds={topProductIds}
      orderId={orderId}
    />
  );
}

function PosError({ resource, error }: { resource: string; error: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Vender</h1>
      <DataFetchError resource={resource} error={error} />
    </div>
  );
}
