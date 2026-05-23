"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Printer, Search, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProductCategory } from "@/features/product-categories/types";
import {
  calculateLabelDimensions,
  DEFAULT_LABEL_SETTINGS,
  LABEL_SIZE_OPTIONS,
  PAGE_SIZE_OPTIONS,
  type LabelPageSize,
  type LabelSizePreset,
  type ProductLabelSettings,
} from "../label-settings";
import { exportLabelSheetSvg } from "../label-export";
import {
  buildProductQueryString,
  MIN_PRODUCT_SEARCH_LENGTH,
} from "../schemas";
import type { Product, ProductListResponse, ProductSearchParams } from "../types";
import { ProductLabelPreview, type SelectedLabelProduct } from "./ProductLabelPreview";

const PRODUCT_SEARCH_DEBOUNCE_MS = 500;
const MAX_LABELS_PER_PRINT = 100;

export function ProductLabelPage({
  initialParams,
  initialProducts,
  categories,
}: {
  initialParams: ProductSearchParams;
  initialProducts: ProductListResponse;
  categories: ProductCategory[];
}) {
  const [params, setParams] = useState(initialParams);
  const [query, setQuery] = useState(initialParams.q ?? "");
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Record<string, SelectedLabelProduct>>({});
  const [labelSettings, setLabelSettings] = useState<ProductLabelSettings>(DEFAULT_LABEL_SETTINGS);
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
    if (!params.q) {
      setProducts({ items: [], total: 0, limit: params.limit, offset: 0 });
      setIsLoading(false);
      setError(null);
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
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar productos");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [params]);

  const selectedProducts = useMemo(() => Object.values(selected), [selected]);
  const totalLabels = useMemo(
    () => selectedProducts.reduce((total, item) => total + item.quantity, 0),
    [selectedProducts],
  );
  const dimensions = useMemo(() => calculateLabelDimensions(labelSettings), [labelSettings]);
  const hasPrintableLabels = totalLabels > 0 && totalLabels <= MAX_LABELS_PER_PRINT;
  const hasSelection = selectedProducts.length > 0;
  const hasAppliedSearch = Boolean(params.q);

  function updateFilters(patch: Partial<ProductSearchParams>) {
    setParams((current) => ({ ...current, ...patch, offset: 0 }));
  }

  function addProduct(product: Product) {
    const code = product.qr_code?.trim();
    if (!code) return;

    setSelected((current) => {
      if (current[product.id]) return current;
      return { ...current, [product.id]: { product, quantity: 1 } };
    });
  }

  function removeProduct(productId: string) {
    setSelected((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  function updateQuantity(product: Product, quantity: number) {
    const nextQuantity = Math.min(Math.max(quantity, 1), MAX_LABELS_PER_PRINT);
    setSelected((current) => ({
      ...current,
      [product.id]: { product, quantity: nextQuantity },
    }));
  }

  function printLabels() {
    if (!hasPrintableLabels) return;
    window.print();
  }

  async function exportSvg() {
    if (!hasPrintableLabels) return;
    await exportLabelSheetSvg({ selectedProducts, settings: labelSettings, dimensions });
  }

  function updateLabelSettings(patch: Partial<ProductLabelSettings>) {
    setLabelSettings((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="space-y-6">
      <section className="print-hidden space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_150px_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar productos</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              className="pl-9"
              aria-describedby="product-label-search-help"
              placeholder="Buscar por nombre, SKU o codigo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span
              id="product-label-search-help"
              className={`mt-1 block min-h-4 text-xs ${
                query.trim() && query.trim().length < MIN_PRODUCT_SEARCH_LENGTH
                  ? "text-amber-700"
                  : "text-slate-500"
              }`}
            >
              Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres para buscar.
            </span>
          </label>
          <Select
            aria-label="Filtro de categoria"
            value={params.category_id ?? ""}
            onChange={(event) =>
              updateFilters({
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
              updateFilters({ stock: event.target.value as ProductSearchParams["stock"] })
            }
          >
            <option value="all">Todo stock</option>
            <option value="available">Disponible</option>
            <option value="low">Stock bajo</option>
            <option value="out">Sin stock</option>
          </Select>
          <Button type="button" onClick={printLabels} disabled={!hasPrintableLabels}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir
          </Button>
          <Button type="button" variant="secondary" onClick={() => void exportSvg()} disabled={!hasPrintableLabels}>
            <Download className="h-4 w-4" aria-hidden="true" />
            SVG
          </Button>
        </div>

        <div
          className={`grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[minmax(0,1fr)_220px] ${
            hasSelection ? "" : "opacity-60"
          }`}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="min-w-0 space-y-2">
                <span className="text-xs font-medium uppercase text-slate-500">Hoja</span>
                <Select
                  className="w-full truncate"
                  aria-label="Tamano de hoja"
                  value={labelSettings.pageSize}
                  disabled={!hasSelection}
                  onChange={(event) => updateLabelSettings({ pageSize: event.target.value as LabelPageSize })}
                >
                  {Object.entries(PAGE_SIZE_OPTIONS).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="min-w-0 space-y-2">
                <span className="text-xs font-medium uppercase text-slate-500">Etiqueta</span>
                <Select
                  className="w-full truncate"
                  aria-label="Tamano de etiqueta"
                  value={labelSettings.labelSize}
                  disabled={!hasSelection}
                  onChange={(event) => updateLabelSettings({ labelSize: event.target.value as LabelSizePreset })}
                >
                  {Object.entries(LABEL_SIZE_OPTIONS).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Datos visibles</p>
              <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-3 lg:grid-cols-5">
                <LabelToggle
                  label="Nombre"
                  checked={labelSettings.showName}
                  disabled={!hasSelection}
                  onChange={(checked) => updateLabelSettings({ showName: checked })}
                />
                <LabelToggle
                  label="Codigo"
                  checked={labelSettings.showCode}
                  disabled={!hasSelection}
                  onChange={(checked) => updateLabelSettings({ showCode: checked })}
                />
                <LabelToggle
                  label="SKU"
                  checked={labelSettings.showSku}
                  disabled={!hasSelection}
                  onChange={(checked) => updateLabelSettings({ showSku: checked })}
                />
                <LabelToggle
                  label="Categoria"
                  checked={labelSettings.showCategory}
                  disabled={!hasSelection}
                  onChange={(checked) => updateLabelSettings({ showCategory: checked })}
                />
                <LabelToggle
                  label="Precio"
                  checked={labelSettings.showPrice}
                  disabled={!hasSelection}
                  onChange={(checked) => updateLabelSettings({ showPrice: checked })}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md bg-white p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-950">Resumen</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <dt>Hoja</dt>
              <dd className="text-right">{labelSettings.pageSize}</dd>
              <dt>Margen</dt>
              <dd className="text-right">{dimensions.marginMm} mm</dd>
              <dt>Etiqueta</dt>
              <dd className="text-right">{toCm(dimensions.labelWidthMm)} x {toCm(dimensions.labelHeightMm)} cm</dd>
              <dt>QR</dt>
              <dd className="text-right">{toCm(dimensions.qrSizeMm)} x {toCm(dimensions.qrSizeMm)} cm</dd>
              <dt>Columnas</dt>
              <dd className="text-right">{dimensions.columns}</dd>
              <dt>Filas aprox.</dt>
              <dd className="text-right">{dimensions.rows}</dd>
              <dt>Por hoja</dt>
              <dd className="text-right">{dimensions.labelsPerPage}</dd>
            </dl>
          </div>
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {totalLabels > MAX_LABELS_PER_PRINT ? (
          <Alert variant="error">Reduce la seleccion a {MAX_LABELS_PER_PRINT} etiquetas o menos.</Alert>
        ) : null}

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <section className="min-h-[260px] overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Resultados</h2>
                  <p className="text-xs text-slate-500">Busca por nombre, SKU o codigo y agrega productos a la seleccion.</p>
                </div>
                <span className="min-h-4 text-xs text-slate-500" aria-live="polite">
                  {isLoading ? "Actualizando..." : ""}
                </span>
              </div>
            </div>
            {!hasAppliedSearch ? (
              <div className="p-6 text-center text-sm text-slate-600">
                Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres para buscar productos.
              </div>
            ) : products.items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-600">No hay productos para la busqueda actual.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {products.items.map((product) => {
                  const isSelected = Boolean(selected[product.id]);
                  const hasCode = Boolean(product.qr_code?.trim());
                  return (
                    <div key={product.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{product.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          SKU: {product.sku || "Sin SKU"} · Codigo: {product.qr_code || "Sin codigo"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!hasCode || isSelected}
                        onClick={() => addProduct(product)}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {isSelected ? "Agregado" : hasCode ? "Agregar" : "Sin codigo"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Seleccionados</h2>
              <p className="text-xs text-slate-500">{totalLabels} etiquetas en total.</p>
            </div>
            {selectedProducts.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-600">
                Agrega productos desde los resultados para configurar cantidades e imprimir.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {selectedProducts.map(({ product, quantity }) => (
                  <div key={product.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_96px_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">{product.name}</p>
                      <p className="truncate font-mono text-xs text-slate-500">{product.qr_code}</p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max={MAX_LABELS_PER_PRINT}
                      value={quantity}
                      aria-label={`Cantidad ${product.name}`}
                      onChange={(event) => updateQuantity(product, Number(event.target.value))}
                    />
                    <Button type="button" variant="ghost" onClick={() => removeProduct(product.id)} aria-label={`Quitar ${product.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <ProductLabelPreview selectedProducts={selectedProducts} settings={labelSettings} dimensions={dimensions} />
    </div>
  );
}

function LabelToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function toCm(mm: number) {
  return (mm / 10).toFixed(2);
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload?.message === "string") return payload.message;
    if (typeof payload?.detail === "string") return payload.detail;
  } catch {
    return "No se pudieron cargar productos";
  }
  return "No se pudieron cargar productos";
}
