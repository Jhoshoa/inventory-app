"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ScanLine, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { ProductCategory } from "@/features/product-categories/types";
import {
  chipLabel,
  directionLabels,
  SORT_FIELD_LABEL,
  SORT_OPTIONS,
  sheetFilterCount,
  STOCK_CHIPS,
  type ProductListCounts,
} from "../list";
import { MIN_PRODUCT_SEARCH_LENGTH } from "../schemas";
import type { ProductSearchParams, ProductSortField, ProductStockFilter, SortDirection } from "../types";

/** En el celular solo van estos chips; el resto queda en "Filtros". */
const PHONE_CHIPS = new Set<ProductStockFilter>(["all", "low", "expiring"]);

export function ProductFilters({
  params,
  query,
  categories = [],
  counts = null,
  total,
  isLoading = false,
  searchMessage = null,
  onQueryChange,
  onSearchSubmit,
  onScan,
  onFilterChange,
}: {
  params: ProductSearchParams;
  query: string;
  categories?: ProductCategory[];
  counts?: ProductListCounts | null;
  /** Productos con los filtros actuales (botón "Ver N productos" de la hoja). */
  total: number;
  isLoading?: boolean;
  /** Aviso bajo el buscador, p. ej. "Ese código no es de ningún producto". */
  searchMessage?: string | null;
  onQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onScan?: () => void;
  onFilterChange: (patch: Partial<ProductSearchParams>) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const trimmedQuery = query.trim();
  const tooShort = trimmedQuery.length > 0 && trimmedQuery.length < MIN_PRODUCT_SEARCH_LENGTH;
  const hint = searchMessage ?? (tooShort ? `Escribe al menos ${MIN_PRODUCT_SEARCH_LENGTH} letras` : null);
  const extraFilters = sheetFilterCount(params);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    // Celular: buscador con escanear y "Filtros", y debajo tres chips que siempre entran.
    // Desde 768 px: buscador, categoría y orden; los cinco chips debajo.
    <div className="flex flex-wrap items-start gap-2">
      <form role="search" onSubmit={onSubmit} className="flex w-full flex-col gap-1 md:w-auto md:min-w-[240px] md:flex-1">
        <div className="flex gap-2">
          <label className="flex h-control min-w-0 flex-1 items-center gap-2 rounded-control border border-app-borderStrong bg-app-surface px-3 focus-within:ring-2 focus-within:ring-focus">
            <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="sr-only">Buscar productos</span>
            <input
              id="product-search"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar o escanear"
              enterKeyHint="search"
              aria-describedby={hint ? "product-search-hint" : undefined}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-text-strong outline-none placeholder:text-text-muted md:text-sm"
            />
          </label>
          {onScan ? (
            <Button type="button" variant="icon" className="md:hidden" aria-label="Escanear código" onClick={onScan}>
              <ScanLine className="h-5 w-5" aria-hidden="true" />
            </Button>
          ) : null}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={extraFilters > 0 ? `Filtros · ${extraFilters} ${extraFilters === 1 ? "activo" : "activos"}` : "Filtros"}
            onClick={() => setSheetOpen(true)}
            className={`relative inline-flex h-control w-[var(--height-control)] shrink-0 items-center justify-center rounded-control border shadow-sm focus:outline-none focus:ring-2 focus:ring-focus md:hidden ${
              extraFilters > 0
                ? "border-text-strong bg-text-strong text-text-inverse"
                : "border-app-border bg-app-surface text-text-body hover:bg-app-surface-muted"
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            {extraFilters > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[11px] font-bold text-text-inverse"
              >
                {extraFilters}
              </span>
            ) : null}
          </button>
        </div>
        {hint ? (
          <span id="product-search-hint" role="status" className="text-xs text-text-muted">
            {hint}
          </span>
        ) : null}
      </form>

      <div role="group" aria-label="Stock" className="flex w-full min-w-0 flex-wrap gap-2 max-[359px]:gap-1.5 md:order-last">
        {STOCK_CHIPS.map((chip) => (
          <Chip
            key={chip.value}
            pressed={params.stock === chip.value}
            className={PHONE_CHIPS.has(chip.value) ? "" : "max-md:hidden"}
            onClick={() => onFilterChange({ stock: chip.value })}
          >
            {chipLabel(chip.label, chip.count ? counts?.[chip.count] : undefined)}
          </Chip>
        ))}
      </div>

      <Select
        aria-label="Categoría"
        className="max-md:hidden md:!w-[180px] lg:!w-[190px]"
        value={params.category_id ?? ""}
        onChange={(event) => onFilterChange({ category_id: event.target.value || undefined, category: undefined })}
      >
        <CategoryOptions categories={categories} />
      </Select>
      <Select
        aria-label="Ordenar por"
        className="max-md:hidden md:!w-[170px] lg:!w-[200px]"
        value={`${params.sort}:${params.direction}`}
        onChange={(event) => {
          const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
          if (option) onFilterChange({ sort: option.sort, direction: option.direction });
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        params={params}
        categories={categories}
        counts={counts}
        total={total}
        isLoading={isLoading}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  params,
  categories,
  counts,
  total,
  isLoading,
  onFilterChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: ProductSearchParams;
  categories: ProductCategory[];
  counts: ProductListCounts | null;
  total: number;
  isLoading: boolean;
  onFilterChange: (patch: Partial<ProductSearchParams>) => void;
}) {
  const directions = directionLabels(params.sort);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} position="sheet" size="md">
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <DialogTitle className="!p-0 text-lg">Filtrar productos</DialogTitle>
        <button
          type="button"
          className="h-9 rounded-control px-2 text-sm font-bold text-brand-700 hover:bg-app-surface-muted"
          onClick={() =>
            onFilterChange({ stock: "all", category_id: undefined, category: undefined, sort: "name", direction: "asc" })
          }
        >
          Limpiar
        </button>
      </div>
      <DialogBody className="flex flex-col gap-4 !pb-5">
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-text-strong">Stock</legend>
          <div className="flex flex-wrap gap-2">
            {STOCK_CHIPS.map((chip) => (
              <Chip key={chip.value} pressed={params.stock === chip.value} onClick={() => onFilterChange({ stock: chip.value })}>
                {chipLabel(chip.label, chip.count ? counts?.[chip.count] : undefined)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="sheet-category">Categoría</Label>
          <Select
            id="sheet-category"
            value={params.category_id ?? ""}
            onChange={(event) => onFilterChange({ category_id: event.target.value || undefined, category: undefined })}
          >
            <CategoryOptions categories={categories} />
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-[1.4] space-y-1.5">
            <Label htmlFor="sheet-sort">Ordenar por</Label>
            <Select
              id="sheet-sort"
              value={params.sort}
              onChange={(event) => {
                const sort = event.target.value as ProductSortField;
                onFilterChange({ sort, direction: sort === "updated_at" ? "desc" : "asc" });
              }}
            >
              {(Object.keys(SORT_FIELD_LABEL) as ProductSortField[]).map((field) => (
                <option key={field} value={field}>
                  {SORT_FIELD_LABEL[field]}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="sheet-direction">Orden</Label>
            <Select
              id="sheet-direction"
              value={params.direction}
              onChange={(event) => onFilterChange({ direction: event.target.value as SortDirection })}
            >
              {(["asc", "desc"] as SortDirection[]).map((direction) => (
                <option key={direction} value={direction}>
                  {directions[direction]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button type="button" className="!h-[52px]" onClick={() => onOpenChange(false)} disabled={isLoading}>
          {isLoading ? "Buscando…" : total === 1 ? "Ver 1 producto" : `Ver ${total} productos`}
        </Button>
      </DialogBody>
    </Dialog>
  );
}

function CategoryOptions({ categories }: { categories: ProductCategory[] }) {
  return (
    <>
      <option value="">Todas las categorías</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </>
  );
}
