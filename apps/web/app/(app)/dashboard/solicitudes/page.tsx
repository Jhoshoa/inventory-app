import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { listStorefrontRequests } from "@/features/storefront-requests/api";
import { StorefrontRequestsTable } from "@/features/storefront-requests/components/StorefrontRequestsTable";

export default async function StorefrontRequestsPage() {
  const requests = await listStorefrontRequests();

  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Solicitudes" }]} />
        }
        title="Solicitudes"
        description="Clientes que pidieron que los contactes desde tu catalogo publico."
      />

      {!requests.ok ? (
        <DataFetchError resource="las solicitudes" error={requests.error.message} />
      ) : (
        <>
          {requests.data.pending_count > 0 ? (
            <p className="text-sm font-medium text-status-warning">
              {requests.data.pending_count} solicitud{requests.data.pending_count === 1 ? "" : "es"} pendiente
              {requests.data.pending_count === 1 ? "" : "s"} de contactar.
            </p>
          ) : null}
          <StorefrontRequestsTable requests={requests.data.items} />
        </>
      )}
    </PageSection>
  );
}
