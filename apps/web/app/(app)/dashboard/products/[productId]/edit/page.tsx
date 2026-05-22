import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
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
  const product = await getProduct(productId);

  if (!product.ok && product.error.status === 404) notFound();

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Editar producto</h1>
          <p className="mt-1 text-sm text-slate-600">
            Actualiza datos comerciales sin perder auditoria de stock.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/dashboard/products/${productId}`}>Volver</Link>
        </Button>
      </div>
      {!product.ok ? (
        <Alert variant="error">No se pudo cargar el producto: {product.error.message}</Alert>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <ProductForm mode="edit" product={product.data} />
        </div>
      )}
    </section>
  );
}
