import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { getProduct, listProductBatches } from "@/features/products/api";
import { ProductForm } from "@/features/products/components/ProductForm";
import { discountPolicyFromStore } from "@/features/products/form";
import { getStore } from "@/features/settings/api";
import { listStoreLocations } from "@/features/store-locations/api";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Editar producto" };

// Editar producto (tablero P02). Solo el dueño; el stock se cambia con "Ajustar stock".
export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await requireSession();
  if (!canManageProducts(session.role)) {
    return (
      <ForbiddenState
        description="Solo el dueño de la tienda puede editar productos."
        actionHref={`/dashboard/products/${productId}`}
        actionLabel="Volver al producto"
      />
    );
  }
  const [product, categories, store, locations, batches] = await Promise.all([
    getProduct(productId),
    listProductCategories(true),
    getStore().catch(() => null),
    listStoreLocations(),
    listProductBatches(productId),
  ]);

  if (!product.ok && product.error.status === 404) notFound();
  if (!product.ok) return <DataFetchError resource="el producto" error={product.error.message} />;

  return (
    <ProductForm
      mode="edit"
      product={product.data}
      categories={categories.ok ? categories.data.items : []}
      storeLocations={locations.ok ? locations.data.items : []}
      policy={store ? discountPolicyFromStore(store) : null}
      batches={batches.ok ? batches.data : null}
    />
  );
}
