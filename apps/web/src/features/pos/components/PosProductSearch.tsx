"use client";

import { useEffect, useState } from "react";
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

  return (
    <section className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar producto</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o QR"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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
      {isLoading ? <Alert>Buscando productos...</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {query.trim().length >= MIN_PRODUCT_SEARCH_LENGTH ? (
        <PosProductResults products={products} onAdd={onAdd} />
      ) : null}
    </section>
  );
}
