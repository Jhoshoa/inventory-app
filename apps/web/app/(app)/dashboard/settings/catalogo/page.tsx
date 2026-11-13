import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getProduct } from "@/features/products/api";
import { getStore } from "@/features/settings/api";
import type { FeaturedProductOption } from "@/features/settings/components/FeaturedProductsPicker";
import { StorefrontSettingsForm } from "@/features/settings/components/StorefrontSettingsForm";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Catálogo público" };

export default async function StorefrontSettingsPage() {
  const session = await requireSession();
  if (session.role !== "owner") {
    return <ForbiddenState description="El catálogo público solo lo configura el dueño." />;
  }

  const storeData = await getStore().catch(() => null);
  const featuredProducts = storeData ? await loadFeaturedProducts(storeData.storefront_settings?.featured_product_ids ?? []) : [];

  return storeData ? (
    <StorefrontSettingsForm storeData={storeData} featuredProducts={featuredProducts} />
  ) : (
    <div className="flex flex-col gap-3">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Catálogo público</h1>
      <DataFetchError resource="tu tienda" error="Intenta recargar la página en unos segundos." />
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
