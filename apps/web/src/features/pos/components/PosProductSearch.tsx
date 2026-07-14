"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScanLine, Search } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/ui";
import { MIN_PRODUCT_SEARCH_LENGTH } from "@/features/products/schemas";
import { PosProductResults } from "./PosProductResults";
import type { PosProduct, PosProductListResponse } from "../types";

export interface PosProductSearchHandle {
  clear: () => void;
  focus: () => void;
}

export const PosProductSearch = forwardRef<PosProductSearchHandle, {
  lastAddedProductName?: string | null;
  onAdd: (product: PosProduct) => void;
}>(function PosProductSearch({
  lastAddedProductName,
  onAdd,
}, ref) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const loadedQueryRef = useRef("");

  const trimmedQuery = query.trim();
  const isTextLoading = trimmedQuery.length >= MIN_PRODUCT_SEARCH_LENGTH && loadedQueryRef.current !== trimmedQuery;

  useImperativeHandle(ref, () => ({
    clear: () => {
      setQuery("");
      setProducts([]);
      setError(null);
    },
    focus: () => inputRef.current?.focus(),
  }), []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setProducts([]);
      setError(null);
      return;
    }
    if (trimmed.length < MIN_PRODUCT_SEARCH_LENGTH) {
      setProducts([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/products/pos?q=${encodeURIComponent(trimmed)}&limit=20&offset=0`,
        );
        if (!response.ok) throw new Error("No se pudo buscar productos");
        const data = (await response.json()) as PosProductListResponse;
        if (!cancelled) {
          loadedQueryRef.current = trimmed;
          setProducts(data.items);
          setError(null);
        }
      } catch (searchError) {
        if (!cancelled) {
          loadedQueryRef.current = trimmed;
          setError(searchError instanceof Error ? searchError.message : "Error de busqueda");
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    return () => {
      lookupAbortRef.current?.abort();
    };
  }, []);

  async function handleExactLookup() {
    const code = query.trim();
    if (!code) return;

    lookupAbortRef.current?.abort();
    const abortController = new AbortController();
    lookupAbortRef.current = abortController;

    setIsLookupLoading(true);
    try {
      const response = await fetch(`/api/products/qr/${encodeURIComponent(code)}`, {
        signal: abortController.signal,
      });
      if (response.status === 404) {
        setError("No se encontro producto para ese codigo.");
        return;
      }
      if (!response.ok) throw new Error("No se pudo buscar el codigo escaneable");
      const product = compactProduct((await response.json()) as PosProduct);
      onAdd(product);
      setQuery("");
      setProducts([]);
      setError(null);
    } catch (lookupError) {
      if (abortController.signal.aborted) return;
      setError(lookupError instanceof Error ? lookupError.message : "Error de busqueda");
    } finally {
      if (!abortController.signal.aborted) {
        setIsLookupLoading(false);
      }
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <section className="min-w-0 space-y-4 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-strong">Buscar y escanear</h2>
          <p className="mt-1 text-sm text-text-muted">
            Escanea un codigo y presiona Enter, o busca por nombre para agregar productos.
          </p>
        </div>
        <Badge variant="default">Caja activa</Badge>
      </div>
      <label className="relative block">
        <span className="sr-only">Buscar producto</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" aria-hidden />
        <Input
          ref={inputRef}
          autoFocus
          className="pl-9"
          placeholder="Buscar por nombre o escanear codigo"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleExactLookup();
            }
          }}
        />
      </label>
      {lastAddedProductName ? (
        <Alert>
          Agregado al carrito: <span className="font-medium text-text-strong">{lastAddedProductName}</span>
        </Alert>
      ) : null}
      {!query.trim() ? (
        <div className="grid gap-3 rounded-lg border border-dashed border-app-borderStrong bg-app-surface-muted p-6 text-center text-sm text-text-muted sm:grid-cols-[auto_1fr] sm:text-left">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-app-border bg-app-surface text-text-muted sm:mx-0">
            <ScanLine className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-medium text-text-strong">Listo para vender</p>
            <p className="mt-1">
              Mantén el cursor en el buscador para escanear rapido o escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres.
            </p>
          </div>
        </div>
      ) : null}
      {query.trim() && query.trim().length < MIN_PRODUCT_SEARCH_LENGTH ? (
        <Alert>Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres para buscar.</Alert>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {query.trim().length >= MIN_PRODUCT_SEARCH_LENGTH ? (
        isTextLoading || isLookupLoading ? (
          <InlineResultsSkeleton />
        ) : (
          <div>
            <PosProductResults products={products} onAdd={onAdd} />
          </div>
        )
      ) : null}
    </section>
  );
});

function InlineResultsSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="block h-4 w-44 animate-pulse rounded bg-app-surface-muted" />
              <span className="block h-5 w-20 animate-pulse rounded-full bg-app-surface-muted" />
            </div>
            <div className="flex gap-4">
              <span className="block h-4 w-16 animate-pulse rounded bg-app-surface-muted" />
              <span className="block h-4 w-32 animate-pulse rounded bg-app-surface-muted" />
            </div>
          </div>
          <span className="block h-9 w-24 animate-pulse rounded-md bg-app-surface-muted" />
        </div>
      ))}
    </div>
  );
}

function compactProduct(product: PosProduct): PosProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    unit: product.unit,
    qr_code: product.qr_code ?? null,
  };
}
