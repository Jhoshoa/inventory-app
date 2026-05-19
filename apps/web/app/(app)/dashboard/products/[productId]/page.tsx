import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { getProduct, listProductStockMovements } from "@/features/products/api";
import { ProductDetail } from "@/features/products/components/ProductDetail";
import { ProductStockMovements } from "@/features/products/components/ProductStockMovements";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const [product, movements] = await Promise.all([
    getProduct(productId),
    listProductStockMovements(productId),
  ]);

  if (!product.ok && product.error.status === 404) notFound();

  return (
    <section className="space-y-6">
      <Button variant="secondary" asChild>
        <Link href="/dashboard/products">Volver a productos</Link>
      </Button>
      {!product.ok ? (
        <Alert variant="error">No se pudo cargar el producto: {product.error.message}</Alert>
      ) : (
        <>
          <ProductDetail product={product.data} />
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
