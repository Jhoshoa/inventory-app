import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { listProducts } from "@/features/products/api";
import { ProductLabelPage } from "@/features/products/components/ProductLabelPage";
import {
  DEFAULT_PRODUCT_LIMIT,
  parseProductSearchParams,
} from "@/features/products/schemas";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function ProductLabelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, rawParams] = await Promise.all([requireSession(), searchParams]);

  if (!canManageProducts(session.role)) {
    return <ForbiddenState description="Imprimir etiquetas requiere permisos de owner." />;
  }

  const params = {
    ...parseProductSearchParams(rawParams),
    limit: DEFAULT_PRODUCT_LIMIT,
    offset: 0,
  };
  const [products, categories] = await Promise.all([
    listProducts(params),
    listProductCategories(),
  ]);

  return (
    <section className="space-y-6">
      <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
            Imprimir etiquetas
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Selecciona productos con codigo escaneable y genera una hoja imprimible.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/products">Volver a productos</Link>
        </Button>
      </div>

      {!products.ok ? (
        <Alert variant="error">
          No se pudieron cargar los productos: {products.error.message}
        </Alert>
      ) : (
        <ProductLabelPage
          initialParams={params}
          initialProducts={products.data}
          categories={categories.ok ? categories.data.items : []}
        />
      )}
    </section>
  );
}
