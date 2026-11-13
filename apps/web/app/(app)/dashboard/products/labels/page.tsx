import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { getProduct, listProducts } from "@/features/products/api";
import { ProductLabelPage } from "@/features/products/components/ProductLabelPage";
import { parseProductSearchParams } from "@/features/products/schemas";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Imprimir etiquetas" };

/** Resultados que se ven sin buscar (los primeros por nombre). */
const RESULTS_LIMIT = 30;

// Imprimir etiquetas (tablero P05). Solo el dueño.
export default async function ProductLabelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, rawParams] = await Promise.all([requireSession(), searchParams]);

  if (!canManageProducts(session.role)) {
    return (
      <ForbiddenState
        description="Solo el dueño de la tienda puede imprimir etiquetas."
        actionHref="/dashboard/products"
        actionLabel="Volver a Productos"
      />
    );
  }

  const params = { ...parseProductSearchParams(rawParams), limit: RESULTS_LIMIT, offset: 0 };
  const preselectedId = typeof rawParams.producto === "string" ? rawParams.producto : null;
  const [products, categories, preselected] = await Promise.all([
    listProducts(params),
    listProductCategories(),
    preselectedId ? getProduct(preselectedId) : Promise.resolve(null),
  ]);
  // Desde "Imprimir etiqueta" del QR: llega elegido, si tiene código (sin código no hay QR).
  const initialSelected =
    preselected?.ok && preselected.data.qr_code?.trim() ? [{ product: preselected.data, quantity: 1 }] : [];

  if (!products.ok) return <DataFetchError resource="los productos" error={products.error.message} />;

  return (
    <ProductLabelPage
      initialParams={params}
      initialProducts={products.data}
      categories={categories.ok ? categories.data.items : []}
      initialSelected={initialSelected}
    />
  );
}
