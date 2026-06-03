import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { getProduct, listProductStockMovements } from "@/features/products/api";
import { ProductDetail } from "@/features/products/components/ProductDetail";
import { ProductStockMovements } from "@/features/products/components/ProductStockMovements";
import { requireSession } from "@/lib/auth/session";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const [session, product, movements] = await Promise.all([
    requireSession(),
    getProduct(productId),
    listProductStockMovements(productId),
  ]);

  if (!product.ok && product.error.status === 404) notFound();

  return (
    <section className="space-y-6">
      {!product.ok ? (
        <Alert variant="error">No se pudo cargar el producto: {product.error.message}</Alert>
      ) : (
        <>
          <ProductDetail product={product.data} role={session.role} />
          {!movements.ok ? (
            <Alert variant="error">
              No se pudo cargar el historial: {movements.error.message}
            </Alert>
          ) : (
            <ProductStockMovements movements={movements.data.items} />
          )}
        </>
      )}
    </section>
  );
}
