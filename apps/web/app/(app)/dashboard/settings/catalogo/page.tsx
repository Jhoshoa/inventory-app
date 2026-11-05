import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getStore } from "@/features/settings/api";
import { StorefrontSettingsForm } from "@/features/settings/components/StorefrontSettingsForm";
import { requireSession } from "@/lib/auth/session";

export default async function StorefrontSettingsPage() {
  const session = await requireSession();
  if (session.role !== "owner") {
    return <ForbiddenState description="El catalogo publico solo lo configura el propietario." />;
  }

  const storeData = await getStore().catch(() => null);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Ajustes", href: "/dashboard/settings" },
              { label: "Catalogo publico" },
            ]}
          />
        }
        title="Catalogo publico"
        description="Un link donde tus clientes ven tus productos y te piden por WhatsApp."
      />
      {storeData ? (
        <StorefrontSettingsForm storeData={storeData} />
      ) : (
        <DataFetchError resource="tu tienda" error="Intenta recargar la pagina en unos segundos." />
      )}
    </div>
  );
}
