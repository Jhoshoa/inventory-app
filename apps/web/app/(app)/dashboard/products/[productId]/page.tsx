import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getProduct, listProductBatches, listProductStockMovements } from "@/features/products/api";
import { ProductDetail } from "@/features/products/components/ProductDetail";
import { DEFAULT_ALERT_DAYS } from "@/features/products/schemas";
import { getStore } from "@/features/settings/api";
import { listStoreLocations } from "@/features/store-locations/api";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Producto" };

// Detalle del producto (tablero P03).
export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await requireSession();
  const owner = canManageProducts(session.role);
  const [product, movements, batches, storeLocations, store] = await Promise.all([
    getProduct(productId),
    listProductStockMovements(productId, 0, 5),
    listProductBatches(productId),
    owner ? listStoreLocations() : null,
    getStore().catch(() => null),
  ]);

  if (!product.ok && product.error.status === 404) notFound();
  if (!product.ok) return <DataFetchError resource="el producto" error={product.error.message} />;

  return (
    <ProductDetail
      product={product.data}
      role={session.role}
      batches={batches.ok ? batches.data : null}
      movements={movements.ok ? movements.data.items : null}
      storeLocations={storeLocations?.ok ? storeLocations.data.items : undefined}
      storefrontEnabled={store?.storefront_enabled ?? false}
      defaultAlertDays={store?.default_alert_days ?? DEFAULT_ALERT_DAYS}
    />
  );
}
