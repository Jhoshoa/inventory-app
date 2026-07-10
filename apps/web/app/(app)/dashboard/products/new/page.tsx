import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { ProductForm } from "@/features/products/components/ProductForm";
import { canManageProducts } from "@/lib/auth/permissions";
import { getAuthToken, requireSession } from "@/lib/auth/session";

export default async function NewProductPage() {
  const session = await requireSession();
  if (!canManageProducts(session.role)) {
    return <ForbiddenState description="Crear productos requiere permisos de owner." />;
  }
  const [categories, accessToken] = await Promise.all([
    listProductCategories(),
    getAuthToken(),
  ]);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Productos", href: "/dashboard/products" },
              { label: "Nuevo producto" },
            ]}
          />
        }
        title="Nuevo producto"
        description="Registra datos basicos, precio y stock inicial."
      />
      <div className="rounded-lg border border-app-border bg-app-surface p-5 shadow-panel">
        <ProductForm mode="create" categories={categories.ok ? categories.data.items : []} accessToken={accessToken ?? ""} />
      </div>
    </PageSection>
  );
}
