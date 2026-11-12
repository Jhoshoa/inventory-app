"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PackagePlus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { PosCameraScanner } from "@/features/pos/components/PosCameraScanner";
import type { ProductCategory } from "@/features/product-categories/types";
import { readErrorMessage } from "@/lib/api/errors";
import { canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { PRODUCT_SEARCH_DEBOUNCE_MS } from "@/lib/constants/ui";
import { hasActiveFilters, localToday, productListSearch, type ProductListCounts } from "../list";
import { buildProductQueryString, MIN_PRODUCT_SEARCH_LENGTH } from "../schemas";
import type { Product, ProductListResponse, ProductSearchParams } from "../types";
import { ProductCsvImportDialog } from "./ProductCsvImportDialog";
import { ProductFilters } from "./ProductFilters";
import { ProductTable } from "./ProductTable";
import { ProductListSkeleton } from "./ProductTableSkeleton";

const LIST_PATH = "/dashboard/products";

function keyOf(params: ProductSearchParams) {
  return `${params.q ?? ""}|${params.category ?? ""}|${params.category_id ?? ""}|${params.stock}|${params.limit}|${params.offset}|${params.sort}|${params.direction}`;
}

export function ProductBrowser({
  initialParams,
  initialProducts,
  role,
  categories = [],
  counts = null,
}: {
  initialParams: ProductSearchParams;
  initialProducts: ProductListResponse;
  role: UserRole;
  categories?: ProductCategory[];
  counts?: ProductListCounts | null;
}) {
  const router = useRouter();
  const [params, setParams] = useState(initialParams);
  const [query, setQuery] = useState(initialParams.q ?? "");
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const debounceRef = useRef<number | undefined>(undefined);
  // Mientras Enter busca el código no se toca la lista ni la URL (si no, se pisa la navegación).
  const openingRef = useRef(false);
  const loadedKeyRef = useRef(keyOf(initialParams));
  const paramsKey = keyOf(params);
  const isLoading = loadedKeyRef.current !== paramsKey && !error;

  // "3 días" en Vence usa la fecha del navegador; en el servidor solo va la fecha.
  useEffect(() => setToday(localToday()), []);

  const paramsKeyRef = useRef(paramsKey);
  paramsKeyRef.current = paramsKey;

  // router.refresh() (después de ajustar stock o eliminar) trae la lista nueva del servidor.
  // Si no es la vista que se está mirando, se vuelve a pedir la de los filtros actuales.
  useEffect(() => {
    if (!mountedRef.current) return;
    if (keyOf(initialParams) === paramsKeyRef.current) {
      setProducts(initialProducts);
      loadedKeyRef.current = paramsKeyRef.current;
    } else {
      setRetry((value) => value + 1);
    }
  }, [initialProducts, initialParams]);

  // Se busca al dejar de escribir; con 1–2 letras no (la API pide 3).
  useEffect(() => {
    const trimmed = query.trim();
    debounceRef.current = window.setTimeout(() => {
      const nextQuery = trimmed.length >= MIN_PRODUCT_SEARCH_LENGTH ? trimmed : undefined;
      if (openingRef.current || (params.q ?? undefined) === nextQuery) return;
      setParams((current) => ({ ...current, q: nextQuery, offset: 0 }));
    }, PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceRef.current);
  }, [params.q, query]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // Filtros y orden en la URL: compartir el link mantiene la vista. Con `null` Next
    // toma la URL nueva, y router.refresh() (al ajustar stock) recarga esta misma vista.
    window.history.replaceState(null, "", `${LIST_PATH}${productListSearch(params)}`);

    const controller = new AbortController();
    setError(null);
    fetch(`/api/products?${buildProductQueryString(params)}`, { signal: controller.signal })
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
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los productos");
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, retry]);

  function updateFilters(patch: Partial<ProductSearchParams>) {
    setParams((current) => ({ ...current, ...patch, offset: 0 }));
  }

  function clearFilters() {
    setQuery("");
    setSearchMessage(null);
    setParams((current) => ({ ...current, q: undefined, category: undefined, category_id: undefined, stock: "all", offset: 0 }));
  }

  /** Un código exacto (QR o código de barras) abre el producto. */
  async function openByCode(code: string) {
    openingRef.current = true;
    try {
      const response = await fetch(`/api/products/qr/${encodeURIComponent(code)}`);
      if (response.ok) {
        const product = (await response.json()) as Pick<Product, "id">;
        router.push(`${LIST_PATH}/${product.id}`);
        return true;
      }
    } catch {
      // Sin conexión o error: se busca como texto.
    }
    openingRef.current = false;
    return false;
  }

  async function onSearchSubmit() {
    const trimmed = query.trim();
    setSearchMessage(null);
    window.clearTimeout(debounceRef.current);
    if (!trimmed) return;
    if (!/\s/.test(trimmed) && (await openByCode(trimmed))) return;
    if (trimmed.length < MIN_PRODUCT_SEARCH_LENGTH) return;
    if (params.q !== trimmed) setParams((current) => ({ ...current, q: trimmed, offset: 0 }));
  }

  async function onScanned(code: string) {
    setScanOpen(false);
    setQuery(code);
    if (!(await openByCode(code))) setSearchMessage("Ese código no es de ningún producto.");
  }

  const owner = canManageProducts(role);
  const showEmptyInventory = products.total === 0 && !hasActiveFilters(params) && !isLoading;
  const showNoResults = products.total === 0 && hasActiveFilters(params) && !isLoading;

  return (
    // En el celular el dueño tiene el botón flotante "+ Nuevo producto": espacio para la última tarjeta.
    <div className={`flex flex-col gap-3.5 ${owner ? "max-sm:pb-16" : ""}`}>
      <ProductFilters
        params={params}
        query={query}
        categories={categories}
        counts={counts}
        total={products.total}
        isLoading={isLoading}
        searchMessage={searchMessage}
        onQueryChange={(value) => {
          setQuery(value);
          setSearchMessage(null);
        }}
        onSearchSubmit={() => void onSearchSubmit()}
        onScan={() => setScanOpen(true)}
        onFilterChange={updateFilters}
      />

      {error ? (
        <DataFetchError resource="los productos" error={error} onRetry={() => setRetry((value) => value + 1)} />
      ) : isLoading ? (
        <ProductListSkeleton owner={owner} />
      ) : showEmptyInventory ? (
        <EmptyState
          icon={PackagePlus}
          title={owner ? "Agrega tu primer producto" : "Todavía no hay productos"}
          description={
            owner
              ? "Crea uno por uno o sube varios de una vez con un archivo CSV."
              : "Cuando el dueño agregue productos, aparecen aquí."
          }
          action={
            owner ? (
              <Button asChild>
                <Link href={`${LIST_PATH}/new`}>Nuevo producto</Link>
              </Button>
            ) : undefined
          }
          secondaryAction={
            owner ? (
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                Importar CSV
              </Button>
            ) : undefined
          }
        />
      ) : showNoResults ? (
        <EmptyState
          icon={SearchX}
          title="Ningún producto con estos filtros"
          description={params.q ? `No hay productos que coincidan con "${params.q}".` : "Prueba con otro filtro o quita los que elegiste."}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <div className="md:overflow-hidden md:rounded-card md:border md:border-app-border md:bg-app-surface">
          <ProductTable products={products.items} role={role} today={today} />
          {products.total > products.limit ? (
            <div className="mt-3 overflow-hidden rounded-card border border-app-border md:mt-0 md:rounded-none md:border-0">
              <Pagination
                total={products.total}
                limit={products.limit}
                offset={products.offset}
                onNavigate={(offset) => setParams((current) => ({ ...current, offset }))}
              />
            </div>
          ) : null}
        </div>
      )}

      <PosCameraScanner
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDetected={(code) => void onScanned(code)}
        onTypeCode={() => window.setTimeout(() => document.getElementById("product-search")?.focus(), 0)}
      />
      {owner ? (
        <ProductCsvImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={() => {
            setImportOpen(false);
            // La lista y los conteos se vuelven a pedir al servidor.
          router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
