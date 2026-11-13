"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Minus, Plus, Printer, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProductCategory } from "@/features/product-categories/types";
import { errorFromResponse } from "@/lib/api/errors";
import { PRODUCT_SEARCH_DEBOUNCE_MS } from "@/lib/constants/ui";
import { exportLabelSheetSvg } from "../label-export";
import {
  calculateLabelDimensions,
  DEFAULT_LABEL_SETTINGS,
  LABEL_SIZE_OPTIONS,
  loadLabelSettings,
  MAX_LABELS_PER_PRODUCT,
  MAX_LABELS_TOTAL,
  PAGE_SIZE_OPTIONS,
  saveLabelSettings,
  sheetCount,
  validateMargin,
  type LabelPageSize,
  type LabelSizePreset,
  type ProductLabelSettings,
} from "../label-settings";
import { buildProductQueryString, MIN_PRODUCT_SEARCH_LENGTH } from "../schemas";
import type { Product, ProductListResponse, ProductSearchParams } from "../types";
import { ProductLabelPreview, type SelectedLabelProduct } from "./ProductLabelPreview";

type Step = "products" | "design" | "print";

const STEPS: { key: Step; label: string }[] = [
  { key: "products", label: "1 · Productos" },
  { key: "design", label: "2 · Diseño" },
  { key: "print", label: "3 · Imprimir" },
];

const PAGE_SHORT: Record<LabelPageSize, string> = { Letter: "Carta", A4: "A4" };

/**
 * Imprimir etiquetas (tablero P05). Escritorio: productos, vista previa y diseño en
 * tres columnas. Hasta 1024 px: tres pasos (Productos → Diseño → Imprimir) con una
 * barra fija abajo. La configuración se recuerda en este equipo.
 */
export function ProductLabelPage({
  initialParams,
  initialProducts,
  categories,
  initialSelected = [],
}: {
  initialParams: ProductSearchParams;
  initialProducts: ProductListResponse;
  categories: ProductCategory[];
  /** "Imprimir etiqueta" desde el QR de un producto: llega ya elegido (?producto=). */
  initialSelected?: SelectedLabelProduct[];
}) {
  const [params, setParams] = useState(initialParams);
  const [query, setQuery] = useState(initialParams.q ?? "");
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<SelectedLabelProduct[]>(initialSelected);
  const [settings, setSettings] = useState<ProductLabelSettings>(DEFAULT_LABEL_SETTINGS);
  const [step, setStep] = useState<Step>("products");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(false);
  const settingsLoadedRef = useRef(false);

  // La configuración guardada se lee en el navegador (en el servidor no existe).
  useEffect(() => {
    setSettings(loadLabelSettings());
    settingsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (settingsLoadedRef.current) saveLabelSettings(settings);
  }, [settings]);

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = window.setTimeout(() => {
      const nextQuery = trimmed.length >= MIN_PRODUCT_SEARCH_LENGTH ? trimmed : undefined;
      if ((params.q ?? undefined) === nextQuery) return;
      setParams((current) => ({ ...current, q: nextQuery, offset: 0 }));
    }, PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [params.q, query]);

  const paramsKey = `${params.q ?? ""}|${params.category_id ?? ""}|${params.stock}`;
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/products?${buildProductQueryString(params)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error((await errorFromResponse(response)).message);
        return response.json() as Promise<ProductListResponse>;
      })
      .then((data) => setProducts(data))
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los productos");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const totalLabels = selected.reduce((total, item) => total + item.quantity, 0);
  const dimensions = useMemo(() => calculateLabelDimensions(settings), [settings]);
  const sheets = sheetCount(totalLabels, dimensions.labelsPerPage);
  const marginError = validateMargin(settings.marginMm);
  const fitsOnPage = dimensions.labelsPerPage > 0;
  const tooMany = totalLabels > MAX_LABELS_TOTAL;
  const canPrint = totalLabels > 0 && fitsOnPage && !marginError && !tooMany;
  const selectedIds = new Set(selected.map((item) => item.product.id));

  function add(product: Product) {
    if (!product.qr_code?.trim() || selectedIds.has(product.id)) return;
    setSelected((current) => [...current, { product, quantity: 1 }]);
  }

  function setQuantity(productId: string, quantity: number) {
    const next = Math.min(Math.max(Math.round(quantity) || 1, 1), MAX_LABELS_PER_PRODUCT);
    setSelected((current) => current.map((item) => (item.product.id === productId ? { ...item, quantity: next } : item)));
  }

  function remove(productId: string) {
    setSelected((current) => current.filter((item) => item.product.id !== productId));
  }

  function update(patch: Partial<ProductLabelSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function print() {
    if (canPrint) window.print();
  }

  async function downloadSvg() {
    if (canPrint) await exportLabelSheetSvg({ selectedProducts: selected, settings, dimensions });
  }

  const summary = `${totalLabels === 1 ? "1 etiqueta" : `${totalLabels} etiquetas`}${
    sheets > 0 ? ` · ${sheets === 1 ? "1 hoja" : `${sheets} hojas`} ${PAGE_SHORT[settings.pageSize]}` : ""
  }`;
  const problem = tooMany
    ? `Son muchas: hasta ${MAX_LABELS_TOTAL} etiquetas por vez.`
    : marginError
      ? `Margen: ${marginError}.`
      : !fitsOnPage
        ? "La etiqueta no entra en la hoja con ese margen. Achica el margen o la etiqueta."
        : null;
  const printLabel = totalLabels > 0 ? `Imprimir ${totalLabels === 1 ? "1 etiqueta" : `${totalLabels} etiquetas`}` : "Imprimir";

  const productsPanel = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="space-y-2 rounded-card border border-app-border bg-app-surface p-3">
        <label className="flex h-control items-center gap-2 rounded-control border border-app-borderStrong bg-app-surface px-3 focus-within:ring-2 focus-within:ring-focus">
          <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <span className="sr-only">Buscar productos</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nombre, SKU o código"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-muted md:text-sm"
          />
        </label>
        {query.trim() && query.trim().length < MIN_PRODUCT_SEARCH_LENGTH ? (
          <p role="status" className="text-xs text-text-muted">
            Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} letras
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="Categoría"
            value={params.category_id ?? ""}
            onChange={(event) => setParams((current) => ({ ...current, category_id: event.target.value || undefined, category: undefined, offset: 0 }))}
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Stock"
            value={params.stock}
            onChange={(event) => setParams((current) => ({ ...current, stock: event.target.value as ProductSearchParams["stock"], offset: 0 }))}
          >
            <option value="all">Todo stock</option>
            <option value="available">Disponible</option>
            <option value="low">Stock bajo</option>
            <option value="out">Sin stock</option>
            <option value="expiring">Por vencer</option>
          </Select>
        </div>
      </div>

      <section aria-labelledby="chosen-title" className="rounded-card border border-app-border bg-app-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="chosen-title" className="text-sm font-bold text-text-strong">
            Elegidos · {selected.length}
          </h2>
          {selected.length > 0 ? (
            <button type="button" className="text-sm font-bold text-brand-700 hover:underline" onClick={() => setSelected([])}>
              Quitar todos
            </button>
          ) : null}
        </div>
        {selected.length === 0 ? (
          <p className="py-3 text-center text-sm text-text-muted">Agrega productos de los resultados.</p>
        ) : (
          <ul className="divide-y divide-app-border">
            {selected.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-text-strong">{product.name}</strong>
                  <span className="block truncate font-mono text-xs text-text-muted">{product.qr_code}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Una etiqueta menos de ${product.name}`}
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-control border border-app-borderStrong disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <input
                    inputMode="numeric"
                    aria-label={`Etiquetas de ${product.name}`}
                    value={quantity}
                    onChange={(event) => setQuantity(product.id, Number(event.target.value.replace(/[^\d]/g, "")))}
                    className="h-8 w-11 rounded-control border border-app-borderStrong text-center text-sm font-bold"
                  />
                  <button
                    type="button"
                    aria-label={`Una etiqueta más de ${product.name}`}
                    disabled={quantity >= MAX_LABELS_PER_PRODUCT}
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-control border border-app-borderStrong disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${product.name}`}
                    onClick={() => remove(product.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:bg-app-surface-muted"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="results-title" className="rounded-card border border-app-border bg-app-surface p-3" aria-busy={loading}>
        <h2 id="results-title" className="mb-2 text-sm font-bold text-text-strong">
          Resultados
        </h2>
        {error ? (
          <p role="alert" className="text-sm text-status-danger">
            {error}
          </p>
        ) : products.items.length === 0 ? (
          <p className="py-3 text-center text-sm text-text-muted">{loading ? "Buscando…" : "Ningún producto con esa búsqueda."}</p>
        ) : (
          <ul className={`divide-y divide-app-border ${loading ? "opacity-60" : ""}`}>
            {products.items.map((product) => {
              const hasCode = Boolean(product.qr_code?.trim());
              const isChosen = selectedIds.has(product.id);
              return (
                <li key={product.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-text-strong">{product.name}</strong>
                    <span className="block truncate text-xs text-text-muted">
                      {hasCode ? product.qr_code : "Sin código: agrégalo en Editar"}
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    className="!h-8 shrink-0 !px-3 text-[13px]"
                    disabled={!hasCode || isChosen}
                    onClick={() => add(product)}
                    aria-label={isChosen ? `${product.name} ya está elegido` : `Agregar ${product.name}`}
                  >
                    {isChosen ? "Elegido" : hasCode ? "Agregar" : "Sin código"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );

  const designPanel = (
    <section aria-labelledby="design-title" className="flex flex-col gap-4 rounded-card border border-app-border bg-app-surface p-4">
      <h2 id="design-title" className="text-[15px] font-bold text-text-strong">
        Diseño
      </h2>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-text-body">Hoja</legend>
        <div className="grid gap-2">
          {(Object.keys(PAGE_SIZE_OPTIONS) as LabelPageSize[]).map((size) => (
            <label
              key={size}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                settings.pageSize === size ? "border-brand-700 bg-brand-50 font-bold text-text-strong" : "border-app-border text-text-body"
              }`}
            >
              <input
                type="radio"
                name="label-page"
                className="h-4 w-4 accent-brand-700"
                checked={settings.pageSize === size}
                onChange={() => update({ pageSize: size })}
              />
              {PAGE_SIZE_OPTIONS[size].label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
        <div className="space-y-1.5">
          <label htmlFor="label-size" className="block text-sm font-medium text-text-body">
            Tamaño de etiqueta
          </label>
          <Select id="label-size" value={settings.labelSize} onChange={(event) => update({ labelSize: event.target.value as LabelSizePreset })}>
            {(Object.keys(LABEL_SIZE_OPTIONS) as LabelSizePreset[]).map((size) => (
              <option key={size} value={size}>
                {LABEL_SIZE_OPTIONS[size].label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="label-margin" className="block text-sm font-medium text-text-body">
            Margen (mm)
          </label>
          <Input
            id="label-margin"
            inputMode="decimal"
            placeholder="8"
            value={settings.marginMm}
            onChange={(event) => update({ marginMm: event.target.value })}
            error={Boolean(marginError)}
            aria-describedby={marginError ? "label-margin-error" : undefined}
          />
        </div>
      </div>
      {marginError ? (
        <p id="label-margin-error" className="-mt-2 text-sm text-status-danger">
          {marginError}
        </p>
      ) : null}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-text-body">Qué se ve</legend>
        <div className="grid grid-cols-2 gap-2 text-sm text-text-body">
          {(
            [
              ["showName", "Nombre"],
              ["showPrice", "Precio"],
              ["showCode", "Código (QR)"],
              ["showSku", "SKU"],
              ["showCategory", "Categoría"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex min-h-9 items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={settings[key]} onChange={(event) => update({ [key]: event.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="rounded-control bg-app-surface-muted px-3 py-2 text-sm text-text-body">
        {fitsOnPage
          ? `${dimensions.columns} ${dimensions.columns === 1 ? "columna" : "columnas"} × ${dimensions.rows} ${dimensions.rows === 1 ? "fila" : "filas"} = ${dimensions.labelsPerPage} por hoja`
          : "No entra ninguna etiqueta por hoja."}
      </p>
    </section>
  );

  return (
    <div className="flex flex-col gap-4 pb-24 lg:pb-4">
      <header className="print-hidden flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="Ruta" className="mb-1 text-[13px] font-semibold text-text-muted">
            <Link href="/dashboard/products" className="hover:text-text-strong">
              Productos
            </Link>{" "}
            <span aria-hidden="true">/</span> Etiquetas
          </nav>
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Imprimir etiquetas</h1>
        </div>
        <div className="flex gap-2 max-lg:hidden">
          <Button variant="secondary" onClick={() => void downloadSvg()} disabled={!canPrint}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar SVG
          </Button>
          <Button onClick={print} disabled={!canPrint}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            {printLabel}
          </Button>
        </div>
      </header>

      <nav aria-label="Pasos" className="print-hidden grid grid-cols-3 gap-1 rounded-control bg-app-surface-muted p-1 lg:hidden">
        {STEPS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={step === item.key ? "step" : undefined}
            onClick={() => setStep(item.key)}
            className={`h-9 rounded-[8px] text-[13px] font-bold ${step === item.key ? "bg-app-surface text-text-strong shadow-sm" : "text-text-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {problem ? (
        <p role="alert" className="print-hidden rounded-control border border-status-warningBorder bg-status-warningBg px-3 py-2 text-sm text-status-warning">
          {problem}
        </p>
      ) : null}

      {/* minmax(0,1fr): sin columnas definidas la única columna crecía con nombres largos (desborde a 375 px). */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)_280px]">
        <div className={`print-hidden ${step === "products" ? "" : "max-lg:hidden"}`}>{productsPanel}</div>
        {/* La vista previa es lo que se imprime: siempre en la página, aunque el paso no la muestre. */}
        <div className={`min-w-0 ${step === "print" ? "" : "max-lg:hidden print:!block"}`}>
          <ProductLabelPreview selectedProducts={selected} settings={settings} dimensions={dimensions} sheets={sheets} />
          <div className="print-hidden mt-3 grid grid-cols-2 gap-2 lg:hidden">
            <Button variant="secondary" onClick={() => void downloadSvg()} disabled={!canPrint}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar SVG
            </Button>
            <Button onClick={print} disabled={!canPrint}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir
            </Button>
          </div>
        </div>
        <div className={`print-hidden ${step === "design" ? "" : "max-lg:hidden"}`}>{designPanel}</div>
      </div>

      {/* Hasta 1024 px: barra fija con el total y el paso siguiente. */}
      <div className="print-hidden fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-app-border bg-app-surface px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 lg:hidden">
        <p className="min-w-0 flex-1 text-sm">
          <strong className="text-text-strong">{summary.split(" · ")[0]}</strong>
          {summary.includes(" · ") ? <span className="text-text-muted"> · {summary.split(" · ")[1]}</span> : null}
        </p>
        {step === "products" ? (
          <Button onClick={() => setStep("design")} disabled={selected.length === 0}>
            Siguiente: diseño
          </Button>
        ) : step === "design" ? (
          <Button onClick={() => setStep("print")} disabled={selected.length === 0}>
            Siguiente: imprimir
          </Button>
        ) : (
          <Button onClick={print} disabled={!canPrint}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            {printLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
