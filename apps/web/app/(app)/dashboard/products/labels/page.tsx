import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Alert } from "@/components/ui/Alert";
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
  const emptyProducts = {
    ok: true as const,
    data: { items: [], total: 0, limit: params.limit, offset: params.offset },
  };
  const [products, categories] = await Promise.all([
    params.q ? listProducts(params) : Promise.resolve(emptyProducts),
    listProductCategories(),
  ]);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        className="print-hidden"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Productos", href: "/dashboard/products" },
              { label: "Imprimir etiquetas" },
            ]}
          />
        }
        title="Imprimir etiquetas"
        description="Selecciona productos con codigo escaneable y genera una hoja imprimible."
      />

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
    </PageSection>
  );
}
