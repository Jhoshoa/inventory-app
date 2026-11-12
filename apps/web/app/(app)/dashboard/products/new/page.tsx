import type { Metadata } from "next";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { ProductForm } from "@/features/products/components/ProductForm";
import { discountPolicyFromStore } from "@/features/products/form";
import { DEFAULT_ALERT_DAYS } from "@/features/products/schemas";
import { getStore } from "@/features/settings/api";
import { listStoreLocations } from "@/features/store-locations/api";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nuevo producto" };

// Nuevo producto (tablero P02). Solo el dueño.
export default async function NewProductPage() {
  const session = await requireSession();
  if (!canManageProducts(session.role)) {
    return (
      <ForbiddenState
        description="Solo el dueño de la tienda puede crear productos."
        actionHref="/dashboard/products"
        actionLabel="Volver a Productos"
      />
    );
  }
  const [categories, store, locations] = await Promise.all([
    listProductCategories(),
    getStore().catch(() => null),
    listStoreLocations(),
  ]);

  return (
    <ProductForm
      mode="create"
      categories={categories.ok ? categories.data.items : []}
      storeLocations={locations.ok ? locations.data.items : []}
      policy={store ? discountPolicyFromStore(store) : null}
      defaultAlertDays={store?.default_alert_days ?? DEFAULT_ALERT_DAYS}
    />
  );
}
