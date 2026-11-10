import { Search } from "lucide-react";
import { notFound } from "next/navigation";
import type { StorefrontSort } from "@/features/storefront/api";
import {
  getPublicStorefront,
  listPublicStorefrontCategories,
  listPublicStorefrontFeatured,
  listPublicStorefrontProducts,
} from "@/features/storefront/api";
import { Pagination } from "@/components/ui/Pagination";
import { STOREFRONT_SORTS } from "@/features/storefront/settings";
import { StorefrontFeaturedCarousel } from "@/features/storefront/components/StorefrontFeaturedCarousel";
import { StorefrontProductGrid } from "@/features/storefront/components/StorefrontProductGrid";
import { StorefrontInfoSection } from "@/features/storefront/components/StorefrontInfoSection";
import { StorefrontSidebar } from "@/features/storefront/components/StorefrontSidebar";
import { StorefrontSortSelect } from "@/features/storefront/components/StorefrontSortSelect";

const PAGE_SIZE = 24;

export default async function StorefrontCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; sort?: string; offset?: string }>;
}) {
  const { slug } = await params;
  const { q, category, sort: rawSort, offset: rawOffset } = await searchParams;
  const offset = Math.max(0, Number(rawOffset) || 0);

  // El orden por defecto lo elige la tienda: sin ?sort= se usa el suyo.
  const store = await getPublicStorefront(slug);
  if (!store) notFound();
  const defaultSort = store.settings.default_sort;
  const sort: StorefrontSort = STOREFRONT_SORTS.includes(rawSort as StorefrontSort)
    ? (rawSort as StorefrontSort)
    : defaultSort;
  const isFirstPage = !q && !category && offset === 0;

  const [categories, productList, featured] = await Promise.all([
    listPublicStorefrontCategories(slug),
    listPublicStorefrontProducts(slug, { q, categoryId: category, sort, limit: PAGE_SIZE, offset }),
    // Solo se muestra en la primera pagina del catalogo sin filtros — repetirlo
    // en cada pagina de paginacion es ruido, no ayuda a encontrar productos.
    isFirstPage && store.settings.show_featured ? listPublicStorefrontFeatured(slug) : Promise.resolve(null),
  ]);

  if (!productList) notFound();

  const activeCategoryName = category ? categories.find((c) => c.id === category)?.name : undefined;
  const emptyTitle = q
    ? `Sin resultados para "${q}"`
    : activeCategoryName
      ? `${activeCategoryName} no tiene productos por ahora`
      : undefined;
  const emptyDescription = q
    ? "Prueba con otra palabra o revisa el catalogo completo."
    : activeCategoryName
      ? "Vuelve mas tarde o explora otras categorias."
      : undefined;

  return (
    <div className="space-y-6">
      <form className="relative" action="">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {sort !== defaultSort ? <input type="hidden" name="sort" value={sort} /> : null}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar producto..."
          className="w-full rounded-full border border-app-borderStrong bg-app-surface py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-focus"
        />
      </form>

      {featured && featured.items.length > 0 ? (
        <StorefrontFeaturedCarousel
          slug={slug}
          products={featured.items}
          title={featured.source === "manual" ? "Destacados" : "Ofertas destacadas"}
          colorPrimary={store.color_primary}
        />
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <StorefrontSidebar
          slug={slug}
          categories={categories}
          activeCategoryId={category}
          q={q}
          colorPrimary={store.color_primary}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {productList.total} producto{productList.total === 1 ? "" : "s"}
              {activeCategoryName ? ` en ${activeCategoryName}` : ""}
            </p>
            <StorefrontSortSelect slug={slug} q={q} categoryId={category} sort={sort} defaultSort={defaultSort} />
          </div>
          <StorefrontProductGrid
            slug={slug}
            products={productList.items}
            colorPrimary={store.color_primary}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
          {productList.total > PAGE_SIZE ? (
            <Pagination
              basePath={`/t/${slug}`}
              searchParams={paginationSearchParams({ q, category, sort, defaultSort })}
              total={productList.total}
              limit={PAGE_SIZE}
              offset={offset}
            />
          ) : null}
        </div>
      </div>

      <StorefrontInfoSection store={store} />
    </div>
  );
}

function paginationSearchParams(values: {
  q?: string;
  category?: string;
  sort: StorefrontSort;
  defaultSort: StorefrontSort;
}) {
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.category) params.set("category", values.category);
  if (values.sort !== values.defaultSort) params.set("sort", values.sort);
  return params;
}
