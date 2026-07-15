import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { listSales } from "@/features/sales/api";
import { SalesBrowser } from "@/features/sales/components/SalesBrowser";
import { parseSalesSearchParams } from "@/features/sales/schemas";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseSalesSearchParams(rawParams);
  const sales = await listSales(params);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        eyebrow="Operacion"
        title="Ventas"
        description="Historial de ventas registradas en la tienda."
      />
      {!sales.ok ? (
        <DataFetchError resource="las ventas" error={sales.error.message} />
      ) : (
        <SalesBrowser
          initialSearchParams={{
            ...params,
            from_date: params.from_date ?? sales.data.from_date,
            to_date: params.to_date ?? sales.data.to_date,
          }}
          initialData={sales.data}
          firstBusinessDate={sales.data.first_business_date}
        />
      )}
    </PageSection>
  );
}
