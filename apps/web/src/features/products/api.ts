import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import {
  buildProductQueryString,
  DEFAULT_PRODUCT_LIMIT,
} from "./schemas";
import type {
  Product,
  ProductListResponse,
  ProductSearchParams,
  StockMovementListResponse,
} from "./types";

export async function listProducts(params: ProductSearchParams) {
  const token = await getAuthToken();
  if (!token) return emptyProductList(params.limit, params.offset);

  return apiRequest<ProductListResponse>(
    `/products?${buildProductQueryString(params)}`,
    { token },
  );
}

export async function getProduct(productId: string) {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: false as const,
      error: new ApiError({
        status: 401,
        code: "unauthorized",
        message: "No session",
      }),
    };
  }
  return apiRequest<Product>(`/products/${productId}`, { token });
}

export async function listProductStockMovements(productId: string, offset = 0) {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: true as const,
      data: { items: [], total: 0, limit: DEFAULT_PRODUCT_LIMIT, offset },
    };
  }
  return apiRequest<StockMovementListResponse>(
    `/products/${productId}/stock-movements?limit=50&offset=${offset}`,
    { token },
  );
}

function emptyProductList(limit: number, offset: number) {
  return {
    ok: true as const,
    data: {
      items: [],
      total: 0,
      limit,
      offset,
    },
  };
}
