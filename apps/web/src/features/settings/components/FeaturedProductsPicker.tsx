"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/format/currency";

export const MAX_FEATURED_PRODUCTS = 10;
const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 250;

export interface FeaturedProductOption {
  id: string;
  name: string;
  price: string;
  stock: number;
}

/** Elige hasta 10 productos para el carrusel del catalogo, en orden. */
export function FeaturedProductsPicker({
  name,
  initialProducts,
  error,
}: {
  name: string;
  initialProducts: FeaturedProductOption[];
  error?: string;
}) {
  const [selected, setSelected] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FeaturedProductOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const trimmed = query.trim();
  const isFull = selected.length >= MAX_FEATURED_PRODUCTS;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/products/pos?q=${encodeURIComponent(trimmed)}&limit=8&offset=0`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("No se pudo buscar productos");
        const data = (await response.json()) as { items: FeaturedProductOption[] };
        setResults(data.items);
        setSearchError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearchError(err instanceof Error ? err.message : "No se pudo buscar productos");
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [trimmed]);

  function add(product: FeaturedProductOption) {
    setSelected((current) =>
      current.some((p) => p.id === product.id) || current.length >= MAX_FEATURED_PRODUCTS
        ? current
        : [...current, product],
    );
  }

  function remove(id: string) {
    setSelected((current) => current.filter((p) => p.id !== id));
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const selectedIds = new Set(selected.map((p) => p.id));

  return (
    <div className="space-y-3">
      {selected.map((product) => (
        <input key={product.id} type="hidden" name={name} value={product.id} />
      ))}

      {selected.length > 0 ? (
        <ol className="divide-y divide-app-border rounded-md border border-app-border">
          {selected.map((product, index) => (
            <li key={product.id} className="flex items-center gap-2 px-3 py-2">
              <span className="w-5 shrink-0 text-xs tabular-nums text-text-muted">{index + 1}.</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text-strong">{product.name}</span>
                <span className="block text-xs text-text-muted">
                  {formatCurrency(product.price)}
                  {product.stock <= 0 ? " · Agotado" : ""}
                </span>
              </span>
              <IconButton label={`Subir ${product.name}`} disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={`Bajar ${product.name}`}
                disabled={index === selected.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </IconButton>
              <IconButton label={`Quitar ${product.name}`} onClick={() => remove(product.id)}>
                <X className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed border-app-borderStrong px-3 py-3 text-sm text-text-muted">
          Sin productos elegidos: el carrusel muestra tus productos en oferta.
        </p>
      )}

      {isFull ? (
        <p className="text-xs text-text-muted">Llegaste al maximo de {MAX_FEATURED_PRODUCTS} productos destacados.</p>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Buscar producto para destacar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter aca no debe guardar todo el formulario.
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Busca un producto para destacar"
              className="pl-9"
            />
          </div>
          {trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH ? (
            <p className="text-xs text-text-muted">Escribe al menos {MIN_QUERY_LENGTH} letras.</p>
          ) : null}
          {searchError ? <p className="text-xs text-status-danger">{searchError}</p> : null}
          {trimmed.length >= MIN_QUERY_LENGTH && !isSearching && !searchError && results.length === 0 ? (
            <p className="text-xs text-text-muted">No encontramos productos con ese nombre.</p>
          ) : null}
          {results.length > 0 ? (
            <ul className="divide-y divide-app-border rounded-md border border-app-border">
              {results.map((product) => {
                const already = selectedIds.has(product.id);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => add(product)}
                      disabled={already}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-app-surface-muted disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <Plus className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-text-strong">{product.name}</span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {already ? "Agregado" : formatCurrency(product.price)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}
      <FieldError message={error} />
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-app-surface-muted hover:text-text-strong disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
