import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getProduct } from "@/features/products/api";
import { getStore } from "@/features/settings/api";
import type { FeaturedProductOption } from "@/features/settings/components/FeaturedProductsPicker";
import { StorefrontSettingsForm } from "@/features/settings/components/StorefrontSettingsForm";
import { requireSession } from "@/lib/auth/session";

export default async function StorefrontSettingsPage() {
  const session = await requireSession();
  if (session.role !== "owner") {
    return <ForbiddenState description="El catalogo publico solo lo configura el propietario." />;
  }

  const storeData = await getStore().catch(() => null);
  const featuredProducts = storeData ? await loadFeaturedProducts(storeData.storefront_settings?.featured_product_ids ?? []) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Inicio", href: "/dashboard" },
              { label: "Configuración", href: "/dashboard/settings" },
              { label: "Catalogo publico" },
            ]}
          />
        }
        title="Catalogo publico"
        description="Un link donde tus clientes ven tus productos y te piden por WhatsApp."
      />
      {storeData ? (
        <StorefrontSettingsForm storeData={storeData} featuredProducts={featuredProducts} />
      ) : (
        <DataFetchError resource="tu tienda" error="Intenta recargar la pagina en unos segundos." />
      )}
    </div>
  );
}

/** Nombre y precio de los destacados guardados. Los borrados se dejan de lado:
 * al guardar de nuevo desaparecen de la lista. */
async function loadFeaturedProducts(ids: string[]): Promise<FeaturedProductOption[]> {
  const results = await Promise.all(ids.map((id) => getProduct(id).catch(() => null)));
  return results.flatMap((result) =>
    result?.ok
      ? [{ id: result.data.id, name: result.data.name, price: result.data.price, stock: result.data.stock }]
      : [],
  );
}
