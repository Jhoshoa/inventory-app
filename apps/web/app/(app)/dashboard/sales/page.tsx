import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Alert } from "@/components/ui/Alert";
import { Pagination } from "@/components/ui/Pagination";
import { listSales } from "@/features/sales/api";
import { SalesDateFilter } from "@/features/sales/components/SalesDateFilter";
import { SalesTable } from "@/features/sales/components/SalesTable";
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
        <Alert variant="error">No se pudieron cargar ventas: {sales.error.message}</Alert>
      ) : (
        <>
          <SalesDateFilter
            params={{
              ...params,
              from_date: params.from_date ?? sales.data.from_date,
              to_date: params.to_date ?? sales.data.to_date,
            }}
            firstBusinessDate={sales.data.first_business_date}
          />
          <SalesTable sales={sales.data.items} />
          <Pagination
            basePath="/dashboard/sales"
            searchParams={new URLSearchParams(rawParamsToStringEntries(rawParams))}
            total={sales.data.total}
            limit={sales.data.limit}
            offset={sales.data.offset}
          />
        </>
      )}
    </PageSection>
  );
}

function rawParamsToStringEntries(
  params: Record<string, string | string[] | undefined>,
): [string, string][] {
  return Object.entries(params).flatMap(([key, value]) => {
    if (!value) return [];
    const first = Array.isArray(value) ? value[0] : value;
    return first ? [[key, first]] : [];
  });
}
