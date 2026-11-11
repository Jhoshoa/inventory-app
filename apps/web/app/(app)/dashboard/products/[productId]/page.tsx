import { notFound } from "next/navigation";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getProduct, listProductBatches, listProductStockMovements } from "@/features/products/api";
import { ProductDetail } from "@/features/products/components/ProductDetail";
import { ProductStockMovements } from "@/features/products/components/ProductStockMovements";
import { listStoreLocations } from "@/features/store-locations/api";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const session = await requireSession();
  const [product, movements, batches, storeLocations] = await Promise.all([
    getProduct(productId),
    listProductStockMovements(productId),
    listProductBatches(productId),
    canManageProducts(session.role) ? listStoreLocations() : null,
  ]);

  if (!product.ok && product.error.status === 404) notFound();

  return (
    <PageSection className="space-y-6">
      {!product.ok ? (
        <DataFetchError resource="el producto" error={product.error.message} />
      ) : (
        <>
          <ProductDetail
            product={product.data}
            role={session.role}
            batches={batches.ok ? batches.data : null}
            storeLocations={storeLocations?.ok ? storeLocations.data.items : undefined}
          />
          {!movements.ok ? (
            <DataFetchError resource="el historial" error={movements.error.message} />
          ) : (
            <ProductStockMovements movements={movements.data.items} />
          )}
        </>
      )}
    </PageSection>
  );
}
