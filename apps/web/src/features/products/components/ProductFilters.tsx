"use client";

import { Search } from "lucide-react";
import { ResponsiveToolbar } from "@/components/layout/ResponsiveToolbar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProductCategory } from "@/features/product-categories/types";
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
  categories = [],
  onQueryChange,
  onFilterChange,
}: {
  params: ProductSearchParams;
  query: string;
  categories?: ProductCategory[];
  onQueryChange: (value: string) => void;
  onFilterChange: (patch: Partial<ProductSearchParams>) => void;
}) {
  const trimmedQuery = query.trim();
  const isSearchPending =
    trimmedQuery.length > 0 && trimmedQuery.length < MIN_PRODUCT_SEARCH_LENGTH;

  return (
    <ResponsiveToolbar className="xl:grid xl:grid-cols-[minmax(220px,1fr)_180px_160px_160px_160px]">
      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" aria-hidden />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {isSearchPending ? (
          <span className="mt-1 block text-xs text-text-muted">
            Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres para buscar.
          </span>
        ) : null}
      </label>
      <Select
        aria-label="Filtro de categoria"
        value={params.category_id ?? ""}
        onChange={(event) =>
          onFilterChange({
            category_id: event.target.value || undefined,
            category: undefined,
          })
        }
      >
        <option value="">Todas las categorias</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
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
    </ResponsiveToolbar>
  );
}
