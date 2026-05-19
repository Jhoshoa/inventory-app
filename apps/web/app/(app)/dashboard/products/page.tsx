import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { listProducts } from "@/features/products/api";
import { ProductFilters } from "@/features/products/components/ProductFilters";
import { ProductTable } from "@/features/products/components/ProductTable";
import { parseProductSearchParams, buildProductQueryString } from "@/features/products/schemas";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseProductSearchParams(rawParams);
  const products = await listProducts(params);
  const urlParams = new URLSearchParams(buildProductQueryString(params));

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

      <ProductFilters params={params} />

      {!products.ok ? (
        <Alert variant="error">
          No se pudieron cargar los productos: {products.error.message}
        </Alert>
      ) : products.data.total === 0 && !params.q && !params.category && params.stock === "all" ? (
        <EmptyState
          title="Todavia no hay productos"
          description="Crea el primer producto para empezar a vender y controlar stock."
          actionLabel="Usa Nuevo producto"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ProductTable products={products.data.items} />
          <Pagination
            basePath="/dashboard/products"
            searchParams={urlParams}
            total={products.data.total}
            limit={products.data.limit}
            offset={products.data.offset}
          />
        </div>
      )}
    </section>
  );
}
