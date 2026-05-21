import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { listProducts } from "@/features/products/api";
import { ProductBrowser } from "@/features/products/components/ProductBrowser";
import { parseProductSearchParams } from "@/features/products/schemas";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseProductSearchParams(rawParams);
  const products = await listProducts(params);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
            Productos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Busca, filtra y administra el inventario de la tienda.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      {!products.ok ? (
        <Alert variant="error">
          No se pudieron cargar los productos: {products.error.message}
        </Alert>
      ) : (
        <ProductBrowser initialParams={params} initialProducts={products.data} />
      )}
    </section>
  );
}
