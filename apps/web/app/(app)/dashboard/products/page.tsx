import type { Metadata } from "next";
import { MoreParentLink } from "@/components/layout/MoreParentLink";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { listProductCategories } from "@/features/product-categories/api";
import { listProducts } from "@/features/products/api";
import { ProductBrowser } from "@/features/products/components/ProductBrowser";
import { ProductListActions } from "@/features/products/components/ProductListActions";
import type { ProductListCounts } from "@/features/products/list";
import { parseProductSearchParams } from "@/features/products/schemas";
import type { ProductSearchParams, ProductStockFilter } from "@/features/products/types";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Productos" };

const COUNT_PARAMS: ProductSearchParams = { stock: "all", limit: 1, offset: 0, sort: "name", direction: "asc" };

async function countProducts(stock: ProductStockFilter) {
  const result = await listProducts({ ...COUNT_PARAMS, stock });
  return result.ok ? result.data.total : null;
}

/** Conteos de los chips con el mismo filtro que la lista (así "Por vencer · 3" son 3 productos). */
async function loadCounts(): Promise<ProductListCounts | null> {
  const [total, low, out, expiring] = await Promise.all(
    (["all", "low", "out", "expiring"] as const).map(countProducts),
  );
  if (total === null || low === null || out === null || expiring === null) return null;
  return { total, low, out, expiring };
}

// Lista de productos (tablero P01): tarjetas en el celular, tabla desde 768 px.
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseProductSearchParams(await searchParams);
  const [session, products, categories, counts] = await Promise.all([
    requireSession(),
    listProducts(params),
    listProductCategories(),
    loadCounts(),
  ]);

  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0">
          <MoreParentLink />
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Productos</h1>
          {counts ? <CountsLine counts={counts} /> : null}
        </div>
        <ProductListActions role={session.role} />
      </header>

      {!products.ok ? (
        <DataFetchError resource="los productos" error={products.error.message} />
      ) : (
        <ProductBrowser
          initialParams={params}
          initialProducts={products.data}
          role={session.role}
          categories={categories.ok ? categories.data.items : []}
          counts={counts}
        />
      )}
    </div>
  );
}

/** "19 productos · 5 con stock bajo · 3 por vencer"; en el celular sin "por vencer" (está en su chip). */
function CountsLine({ counts }: { counts: ProductListCounts }) {
  if (counts.total === 0) return <p className="text-sm text-text-muted">Sin productos todavía</p>;
  return (
    <p className="text-sm text-text-muted">
      {counts.total === 1 ? "1 producto" : `${counts.total} productos`}
      {counts.low > 0 ? ` · ${counts.low} con stock bajo` : null}
      {counts.expiring > 0 ? <span className="hidden sm:inline">{` · ${counts.expiring} por vencer`}</span> : null}
    </p>
  );
}
