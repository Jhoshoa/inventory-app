"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PackagePlus } from "lucide-react";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { readErrorMessage } from "@/lib/api/errors";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/ui";
import { canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import type { ProductCategory } from "@/features/product-categories/types";
import {
  buildProductQueryString,
  MIN_PRODUCT_SEARCH_LENGTH,
} from "../schemas";
import type { ProductListResponse, ProductSearchParams } from "../types";
import { ProductFilters } from "./ProductFilters";
import { ProductTable } from "./ProductTable";

export function ProductBrowser({
  initialParams,
  initialProducts,
  role,
  categories = [],
}: {
  initialParams: ProductSearchParams;
  initialProducts: ProductListResponse;
  role: UserRole;
  categories?: ProductCategory[];
}) {
  const [params, setParams] = useState(initialParams);
  const [query, setQuery] = useState(initialParams.q ?? "");
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const loadedKeyRef = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = window.setTimeout(() => {
      const nextQuery =
        trimmed.length >= MIN_PRODUCT_SEARCH_LENGTH ? trimmed : undefined;

      if ((params.q ?? undefined) === nextQuery) return;
      setParams((current) => ({ ...current, q: nextQuery, offset: 0 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [params.q, query]);

  const paramsKey = `${params.q ?? ""}|${params.category ?? ""}|${params.category_id ?? ""}|${params.stock}|${params.limit}|${params.offset}|${params.sort}|${params.direction}`;
  const isLoading = mountedRef.current && loadedKeyRef.current !== paramsKey;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadedKeyRef.current = paramsKey;
      return;
    }

    const controller = new AbortController();
    setError(null);

    fetch(`/api/products?${buildProductQueryString(params)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudieron cargar los productos"));
        return response.json() as Promise<ProductListResponse>;
      })
      .then((data) => {
        loadedKeyRef.current = paramsKey;
        setProducts(data);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        loadedKeyRef.current = paramsKey;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los productos");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, params]);

  function updateFilters(patch: Partial<ProductSearchParams>) {
    setParams((current) => ({ ...current, ...patch, offset: 0 }));
  }

  function goToOffset(offset: number) {
    setParams((current) => ({ ...current, offset }));
  }

  const showEmptyInventory =
    products.total === 0 &&
    !params.q &&
    !params.category &&
    params.stock === "all";
  const canCreateProducts = canManageProducts(role);

  return (
    <>
      <ProductFilters
        params={params}
        query={query}
        categories={categories}
        onQueryChange={setQuery}
        onFilterChange={updateFilters}
      />

      {error ? (
        <DataFetchError resource="los productos" error={error} />
      ) : null}

      {!error && showEmptyInventory ? (
        <EmptyState
          icon={PackagePlus}
          title="Todavia no hay productos"
          description={
            canCreateProducts
              ? "Crea el primer producto para empezar a vender y controlar stock."
              : "La tienda todavia no tiene productos disponibles para vender."
          }
          action={
            canCreateProducts ? (
              <Button asChild>
                <Link href="/dashboard/products/new">Crear producto</Link>
              </Button>
            ) : undefined
          }
        />
      ) : !error ? (
        isLoading ? (
          <InlineTableSkeleton />
        ) : (
          <div className="rounded-lg border border-app-border bg-app-surface shadow-panel">
            <ProductTable products={products.items} role={role} />
            <Pagination
              total={products.total}
              limit={products.limit}
              offset={products.offset}
              onNavigate={goToOffset}
            />
          </div>
        )
      ) : null}
    </>
  );
}

const HEADERS = ["Producto", "SKU", "Categoria", "Precio", "Stock", "Estado", "Acciones"];

function InlineTableSkeleton() {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface shadow-panel">
      <table className="w-full">
        <thead>
          <tr className="border-b border-app-border">
            {HEADERS.map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                <span className="block h-3 w-16 animate-pulse rounded bg-app-surface-muted" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-app-border last:border-b-0">
              {Array.from({ length: 7 }, (_, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  <span
                    className={`block h-4 animate-pulse rounded bg-app-surface-muted ${
                      cellIndex === 0 ? "w-36" : cellIndex === 1 ? "w-20" : cellIndex === 4 ? "w-12" : "w-16"
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-app-border px-4 py-3">
        <span className="h-4 w-48 animate-pulse rounded bg-app-border" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index} className="block h-8 w-8 animate-pulse rounded-md bg-app-surface-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}


