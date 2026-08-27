import { getBackendApiUrl } from "@/lib/env/server";
import type {
  PublicStorefront,
  PublicStorefrontCategory,
  PublicStorefrontProduct,
  PublicStorefrontProductList,
} from "./types";

// No usa `apiRequest` (lib/api/client) a proposito: ese helper fuerza
// `cache: "no-store"` porque esta pensado para datos privados del dashboard,
// siempre frescos. El catalogo publico es lo opuesto — queremos que Next.js
// lo sirva desde cache/ISR para no golpear el backend en cada visita.
const STOREFRONT_REVALIDATE_SECONDS = 300;

async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendApiUrl()}/api/v1${path}`, {
      next: { revalidate: STOREFRONT_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublicStorefront(slug: string): Promise<PublicStorefront | null> {
  return fetchPublic<PublicStorefront>(`/public/storefront/${encodeURIComponent(slug)}`);
}

export type StorefrontSort = "name" | "price_asc" | "price_desc";

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
    `/public/storefront/${encodeURIComponent(slug)}/products${qs ? `?${qs}` : ""}`,
  );
}

export async function listPublicStorefrontCategories(slug: string): Promise<PublicStorefrontCategory[]> {
  const result = await fetchPublic<PublicStorefrontCategory[]>(
    `/public/storefront/${encodeURIComponent(slug)}/categories`,
  );
  return result ?? [];
}

export async function getPublicStorefrontProduct(
  slug: string,
  productId: string,
): Promise<PublicStorefrontProduct | null> {
  return fetchPublic<PublicStorefrontProduct>(
    `/public/storefront/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}`,
  );
}
