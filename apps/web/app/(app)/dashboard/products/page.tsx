import Link from "next/link";
import { PackagePlus, Tags } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { listProductCategories } from "@/features/product-categories/api";
import { listProducts } from "@/features/products/api";
import { ProductBrowser } from "@/features/products/components/ProductBrowser";
import { ProductCsvImportTrigger } from "@/features/products/components/ProductCsvImportTrigger";
import { parseProductSearchParams } from "@/features/products/schemas";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseProductSearchParams(rawParams);
  const [session, products, categories] = await Promise.all([
    requireSession(),
    listProducts(params),
    listProductCategories(),
  ]);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Productos"
        description="Busca, filtra y administra el inventario de la tienda."
        actions={
          canManageProducts(session.role) ? (
          <>
            <Button variant="secondary" asChild>
              <Link href="/dashboard/products/labels">
                <Tags className="h-4 w-4" aria-hidden="true" />
                Imprimir etiquetas
              </Link>
            </Button>
            <ProductCsvImportTrigger />
            <Button asChild>
              <Link href="/dashboard/products/new">
                <PackagePlus className="h-4 w-4" aria-hidden="true" />
                Nuevo producto
              </Link>
            </Button>
          </>
          ) : undefined
        }
      />

      {!products.ok ? (
        <Alert variant="error">
          No se pudieron cargar los productos: {products.error.message}
        </Alert>
      ) : (
        <ProductBrowser
          initialParams={params}
          initialProducts={products.data}
          role={session.role}
          categories={categories.ok ? categories.data.items : []}
        />
      )}

    </PageSection>
  );
}
