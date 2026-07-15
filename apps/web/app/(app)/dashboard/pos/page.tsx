import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { PosWorkspace } from "@/features/pos/components/PosWorkspace";
import { getCurrentStoreDay } from "@/features/store-day/api";
import { StoreClosedNotice } from "@/features/store-day/components/StoreClosedNotice";

export default async function PosPage() {
  const storeDay = await getCurrentStoreDay();

  return (
    <PageSection className="space-y-6">
      <PageHeader
        eyebrow="Ventas"
        title="POS"
        description="Busca productos, arma el carrito y confirma ventas."
      />
      {!storeDay.ok ? (
        <DataFetchError resource="el estado de tienda" error={storeDay.error.message} />
      ) : storeDay.data.status !== "open" ? (
        <StoreClosedNotice />
      ) : (
        <PosWorkspace />
      )}
    </PageSection>
  );
}
