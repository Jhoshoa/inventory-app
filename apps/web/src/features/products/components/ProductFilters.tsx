"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MIN_PRODUCT_SEARCH_LENGTH } from "../schemas";
import type {
  ProductSearchParams,
  ProductSortField,
  ProductStockFilter,
  SortDirection,
} from "../types";

export function ProductFilters({
  params,
  query,
  onQueryChange,
  onFilterChange,
}: {
  params: ProductSearchParams;
  query: string;
  onQueryChange: (value: string) => void;
  onFilterChange: (patch: Partial<ProductSearchParams>) => void;
}) {
  const trimmedQuery = query.trim();
  const isSearchPending =
    trimmedQuery.length > 0 && trimmedQuery.length < MIN_PRODUCT_SEARCH_LENGTH;

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_160px_160px_160px]">
      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {isSearchPending ? (
          <span className="mt-1 block text-xs text-slate-500">
            Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres para buscar.
          </span>
        ) : null}
      </label>
      <Select
        aria-label="Filtro de stock"
        value={params.stock}
        onChange={(event) =>
          onFilterChange({ stock: event.target.value as ProductStockFilter })
        }
      >
        <option value="all">Todo stock</option>
        <option value="available">Disponible</option>
        <option value="low">Stock bajo</option>
        <option value="out">Sin stock</option>
      </Select>
      <Select
        aria-label="Ordenar por"
        value={params.sort}
        onChange={(event) =>
          onFilterChange({ sort: event.target.value as ProductSortField })
        }
      >
        <option value="name">Nombre</option>
        <option value="stock">Stock</option>
        <option value="price">Precio</option>
        <option value="updated_at">Actualizado</option>
      </Select>
      <Select
        aria-label="Direccion"
        value={params.direction}
        onChange={(event) =>
          onFilterChange({ direction: event.target.value as SortDirection })
        }
      >
        <option value="asc">Ascendente</option>
        <option value="desc">Descendente</option>
      </Select>
    </div>
  );
}
