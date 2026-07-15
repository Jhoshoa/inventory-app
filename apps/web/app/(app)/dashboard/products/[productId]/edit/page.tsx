import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { getProduct } from "@/features/products/api";
import { ProductForm } from "@/features/products/components/ProductForm";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const session = await requireSession();
  if (!canManageProducts(session.role)) {
    return <ForbiddenState description="Editar productos requiere permisos de owner." />;
  }
  const [product, categories] = await Promise.all([
    getProduct(productId),
    listProductCategories(true),
  ]);

  if (!product.ok && product.error.status === 404) notFound();

  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Productos", href: "/dashboard/products" },
              { label: "Detalle", href: `/dashboard/products/${productId}` },
              { label: "Editar" },
            ]}
          />
        }
        title="Editar producto"
        description="Actualiza datos comerciales sin perder auditoria de stock."
      />
      {!product.ok ? (
        <DataFetchError resource="el producto" error={product.error.message} />
      ) : (
        <div className="rounded-lg border border-app-border bg-app-surface p-5 shadow-panel">
          <ProductForm mode="edit" product={product.data} categories={categories.ok ? categories.data.items : []} />
        </div>
      )}
    </PageSection>
  );
}
