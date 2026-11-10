import { getBackendApiUrl } from "@/lib/env/server";
import type {
  PublicStorefront,
  PublicStorefrontCategory,
  PublicStorefrontFeatured,
  PublicStorefrontProduct,
  PublicStorefrontProductList,
} from "./types";

// No usa `apiRequest` (lib/api/client) a proposito: ese helper fuerza
// `cache: "no-store"` porque esta pensado para datos privados del dashboard,
// siempre frescos. El catalogo publico es lo opuesto — queremos que Next.js
// lo sirva desde cache/ISR para no golpear el backend en cada visita.
const STOREFRONT_REVALIDATE_SECONDS = 300;

/** Etiqueta de cache de un catalogo: al guardar Ajustes se invalida con revalidateTag. */
export function storefrontCacheTag(slug: string) {
  return `storefront:${slug}`;
}

async function fetchPublic<T>(slug: string, path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendApiUrl()}/api/v1${path}`, {
      next: { revalidate: STOREFRONT_REVALIDATE_SECONDS, tags: [storefrontCacheTag(slug)] },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublicStorefront(slug: string): Promise<PublicStorefront | null> {
  return fetchPublic<PublicStorefront>(slug, `/public/storefront/${encodeURIComponent(slug)}`);
}

export type { StorefrontSort } from "./settings";
import type { StorefrontSort } from "./settings";

export async function listPublicStorefrontProducts(
  slug: string,
  params: {
    q?: string;
    categoryId?: string;
    onSale?: boolean;
    sort?: StorefrontSort;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PublicStorefrontProductList | null> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.categoryId) query.set("category_id", params.categoryId);
  if (params.onSale) query.set("on_sale", "true");
  if (params.sort) query.set("sort", params.sort);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return fetchPublic<PublicStorefrontProductList>(
    slug,
    `/public/storefront/${encodeURIComponent(slug)}/products${qs ? `?${qs}` : ""}`,
  );
}

/** Carrusel: los productos que eligio la tienda o, si no eligio, los en oferta. */
export async function listPublicStorefrontFeatured(slug: string): Promise<PublicStorefrontFeatured | null> {
  return fetchPublic<PublicStorefrontFeatured>(slug, `/public/storefront/${encodeURIComponent(slug)}/featured`);
}

export async function listPublicStorefrontCategories(slug: string): Promise<PublicStorefrontCategory[]> {
  const result = await fetchPublic<PublicStorefrontCategory[]>(
    slug,
    `/public/storefront/${encodeURIComponent(slug)}/categories`,
  );
  return result ?? [];
}

export async function getPublicStorefrontProduct(
  slug: string,
  productId: string,
): Promise<PublicStorefrontProduct | null> {
  return fetchPublic<PublicStorefrontProduct>(
    slug,
    `/public/storefront/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}`,
  );
}
