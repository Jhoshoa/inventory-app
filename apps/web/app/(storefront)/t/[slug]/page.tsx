import { notFound } from "next/navigation";
import type { StorefrontSort } from "@/features/storefront/api";
import {
  getPublicStorefront,
  listPublicStorefrontCategories,
  listPublicStorefrontFeatured,
  listPublicStorefrontProducts,
} from "@/features/storefront/api";
import { STOREFRONT_SORTS } from "@/features/storefront/settings";
import { ListaCatalog } from "@/features/storefront/templates/Lista";
import { VitrinaCatalog } from "@/features/storefront/templates/Vitrina";

const VITRINA_PAGE_SIZE = 24;
// La lista de precios muestra el catalogo entero de una vez (agrupado por
// categoria); solo pagina en catalogos de mas de 200 productos.
const LISTA_PAGE_SIZE = 200;

export default async function StorefrontCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; sort?: string; offset?: string }>;
}) {
  const { slug } = await params;
  const { q, category: rawCategory, sort: rawSort, offset: rawOffset } = await searchParams;
  const offset = Math.max(0, Number(rawOffset) || 0);

  // El orden por defecto lo elige la tienda: sin ?sort= se usa el suyo.
  const store = await getPublicStorefront(slug);
  if (!store) notFound();
  const isList = store.settings.template === "lista";
  const defaultSort = store.settings.default_sort;
  const sort: StorefrontSort = STOREFRONT_SORTS.includes(rawSort as StorefrontSort)
    ? (rawSort as StorefrontSort)
    : defaultSort;
  // En la lista las categorias son anclas dentro de la pagina, no un filtro.
  const category = isList ? undefined : rawCategory;
  const pageSize = isList ? LISTA_PAGE_SIZE : VITRINA_PAGE_SIZE;
  const isFirstPage = !q && !category && offset === 0;

  const [categories, productList, featured] = await Promise.all([
    listPublicStorefrontCategories(slug),
    listPublicStorefrontProducts(slug, { q, categoryId: category, sort, limit: pageSize, offset }),
    !isList && isFirstPage && store.settings.show_featured ? listPublicStorefrontFeatured(slug) : Promise.resolve(null),
  ]);

  if (!productList) notFound();

  const data = { slug, store, categories, productList, featured, q, category, sort, defaultSort, offset, pageSize };
  return isList ? <ListaCatalog {...data} /> : <VitrinaCatalog {...data} />;
}
