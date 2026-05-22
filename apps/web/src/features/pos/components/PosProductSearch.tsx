"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { MIN_PRODUCT_SEARCH_LENGTH } from "@/features/products/schemas";
import { PosProductResults } from "./PosProductResults";
import type { PosProduct, PosProductListResponse } from "../types";

const POS_SEARCH_DEBOUNCE_MS = 500;

export function PosProductSearch({
  onAdd,
}: {
  onAdd: (product: PosProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/products/pos?q=${encodeURIComponent(trimmed)}&limit=20&offset=0`,
        );
        if (!response.ok) throw new Error("No se pudo buscar productos");
        const data = (await response.json()) as PosProductListResponse;
        if (!cancelled) {
          setProducts(data.items);
          setError(null);
        }
      } catch (searchError) {
        if (!cancelled) {
          setError(searchError instanceof Error ? searchError.message : "Error de busqueda");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, POS_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  async function handleExactLookup() {
    const code = query.trim();
    if (!code) return;

    setIsLookupLoading(true);
    try {
      const response = await fetch(`/api/products/qr/${encodeURIComponent(code)}`);
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
      setError(lookupError instanceof Error ? lookupError.message : "Error de busqueda");
    } finally {
      setIsLookupLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <section className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar producto</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
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
      {!query.trim() ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          Escribe para buscar productos disponibles.
        </div>
      ) : null}
      {query.trim() && query.trim().length < MIN_PRODUCT_SEARCH_LENGTH ? (
        <Alert>Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres para buscar.</Alert>
      ) : null}
      {isLoading || isLookupLoading ? <Alert>Buscando productos...</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {query.trim().length >= MIN_PRODUCT_SEARCH_LENGTH ? (
        <PosProductResults products={products} onAdd={onAdd} />
      ) : null}
    </section>
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
