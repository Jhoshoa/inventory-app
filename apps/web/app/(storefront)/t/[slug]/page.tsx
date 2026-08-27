import { notFound } from "next/navigation";
import type { StorefrontSort } from "@/features/storefront/api";
import {
  getPublicStorefront,
  listPublicStorefrontCategories,
  listPublicStorefrontProducts,
} from "@/features/storefront/api";
import { StorefrontFeaturedCarousel } from "@/features/storefront/components/StorefrontFeaturedCarousel";
import { StorefrontProductGrid } from "@/features/storefront/components/StorefrontProductGrid";
import { StorefrontSidebar } from "@/features/storefront/components/StorefrontSidebar";
import { StorefrontSortSelect } from "@/features/storefront/components/StorefrontSortSelect";

const VALID_SORTS: StorefrontSort[] = ["name", "price_asc", "price_desc"];

export default async function StorefrontCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { q, category, sort: rawSort } = await searchParams;
  const sort: StorefrontSort = VALID_SORTS.includes(rawSort as StorefrontSort)
    ? (rawSort as StorefrontSort)
    : "name";

  const [store, categories, productList, featured] = await Promise.all([
    getPublicStorefront(slug),
    listPublicStorefrontCategories(slug),
    listPublicStorefrontProducts(slug, { q, categoryId: category, sort, limit: 48 }),
    q || category ? Promise.resolve(null) : listPublicStorefrontProducts(slug, { onSale: true, limit: 10 }),
  ]);

  if (!store || !productList) notFound();

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
      <form className="flex gap-2" action="">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {sort !== "name" ? <input type="hidden" name="sort" value={sort} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar producto..."
          className="w-full rounded-md border border-app-borderStrong bg-app-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-focus"
        />
      </form>

      {featured && featured.items.length > 0 ? (
        <StorefrontFeaturedCarousel slug={slug} products={featured.items} colorPrimary={store.color_primary} />
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
            <StorefrontSortSelect slug={slug} q={q} categoryId={category} sort={sort} />
          </div>
          <StorefrontProductGrid
            slug={slug}
            products={productList.items}
            colorPrimary={store.color_primary}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </div>
      </div>
    </div>
  );
}
