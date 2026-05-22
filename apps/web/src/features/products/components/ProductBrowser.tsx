"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import {
  buildProductQueryString,
  MIN_PRODUCT_SEARCH_LENGTH,
} from "../schemas";
import type { ProductListResponse, ProductSearchParams } from "../types";
import { ProductFilters } from "./ProductFilters";
import { ProductTable } from "./ProductTable";

const PRODUCT_SEARCH_DEBOUNCE_MS = 500;

export function ProductBrowser({
  initialParams,
  initialProducts,
  role,
}: {
  initialParams: ProductSearchParams;
  initialProducts: ProductListResponse;
  role: UserRole;
}) {
  const [params, setParams] = useState(initialParams);
  const [query, setQuery] = useState(initialParams.q ?? "");
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const didMountRef = useRef(false);

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = window.setTimeout(() => {
      const nextQuery =
        trimmed.length >= MIN_PRODUCT_SEARCH_LENGTH ? trimmed : undefined;

      if ((params.q ?? undefined) === nextQuery) return;
      setParams((current) => ({ ...current, q: nextQuery, offset: 0 }));
    }, PRODUCT_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [params.q, query]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/products?${buildProductQueryString(params)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readErrorMessage(response));
        return response.json() as Promise<ProductListResponse>;
      })
      .then((data) => setProducts(data))
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los productos");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [params]);

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
        onQueryChange={setQuery}
        onFilterChange={updateFilters}
      />

      {error ? (
        <Alert variant="error">No se pudieron cargar los productos: {error}</Alert>
      ) : null}
      {isLoading ? <Alert>Actualizando productos...</Alert> : null}

      {!error && showEmptyInventory ? (
        <EmptyState
          title="Todavia no hay productos"
          description={
            canCreateProducts
              ? "Crea el primer producto para empezar a vender y controlar stock."
              : "La tienda todavia no tiene productos disponibles para vender."
          }
          actionLabel={canCreateProducts ? "Usa Nuevo producto" : undefined}
        />
      ) : !error ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ProductTable products={products.items} role={role} />
          <ProductPagination
            total={products.total}
            limit={products.limit}
            offset={products.offset}
            onChange={goToOffset}
          />
        </div>
      ) : null}
    </>
  );
}

function ProductPagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const previousOffset = Math.max(offset - limit, 0);
  const nextOffset = offset + limit;
  const hasPrevious = offset > 0;
  const hasNext = nextOffset < total;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Mostrando {from}-{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          type="button"
          disabled={!hasPrevious}
          onClick={() => onChange(previousOffset)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Anterior
        </Button>
        <Button
          variant="secondary"
          type="button"
          disabled={!hasNext}
          onClick={() => onChange(nextOffset)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload?.message === "string") return payload.message;
    if (typeof payload?.detail === "string") return payload.detail;
  } catch {
    return "No se pudieron cargar los productos";
  }
  return "No se pudieron cargar los productos";
}
