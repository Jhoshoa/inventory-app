import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/env/server";
import {
  buildProductQueryString,
  DEFAULT_PRODUCT_LIMIT,
} from "./schemas";
import type {
  ImportJob,
  ImportJobListResponse,
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

export async function importProductsCsv(file: File): Promise<ImportJob> {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiError({
      status: 401,
      code: "unauthorized",
      message: "No session",
    });
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getBackendApiUrl()}/api/v1/products/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError({
      status: response.status,
      code: "import_error",
      message: body.detail || body.message || "Error al importar productos",
    });
  }

  return response.json();
}

export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const response = await fetch(`${getBackendApiUrl()}/api/v1/products/import/${jobId}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  return response.json();
}

export async function listImportJobs(): Promise<ImportJob[]> {
  const token = await getAuthToken();
  if (!token) return [];

  const response = await fetch(`${getBackendApiUrl()}/api/v1/products/import`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];
  const data: ImportJobListResponse = await response.json();
  return data.items;
}
