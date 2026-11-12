"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Camera, MapPin, Search } from "lucide-react";
import { MIN_PRODUCT_SEARCH_LENGTH } from "@/features/products/schemas";
import { PRODUCT_SEARCH_DEBOUNCE_MS } from "@/lib/constants/ui";
import { formatCurrency } from "@/lib/format/currency";
import { getOfflineDb } from "@/lib/offline/db";
import { toPosProduct } from "../catalog";
import type { PosProduct, PosProductListResponse } from "../types";
import { PosCameraScanner } from "./PosCameraScanner";

export interface PosSearchHandle {
  focus: () => void;
  clear: () => void;
}

/**
 * Buscar en Vender (tablero A · POS): 3+ letras (también sin conexión, en los productos
 * guardados en el equipo), código + Enter para el lector USB, cámara, y "Más vendidos"
 * para tocar sin buscar. "Sin stock" no se puede agregar.
 */
export const PosSearch = forwardRef<
  PosSearchHandle,
  {
    isOnline: boolean;
    topProducts: PosProduct[];
    onAdd: (product: PosProduct) => void;
    inCart: (productId: string) => number;
  }
>(function PosSearch({ isOnline, topProducts, onAdd, inCart }, ref) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosProduct[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canUseCamera, setCanUseCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lookupRef = useRef<AbortController | null>(null);
  const trimmed = query.trim();

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setQuery("");
      setResults(null);
      setMessage(null);
    },
  }), []);

  useEffect(() => {
    // La cámara solo existe en contextos seguros (https o localhost).
    setCanUseCamera(typeof navigator.mediaDevices?.getUserMedia === "function");
  }, []);

  useEffect(() => () => lookupRef.current?.abort(), []);

  useEffect(() => {
    if (trimmed.length < MIN_PRODUCT_SEARCH_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const found = isOnline ? await searchOnline(trimmed) : await searchOffline(trimmed);
        if (!cancelled) {
          setResults(found);
          setMessage(null);
        }
      } catch {
        // Si la red falla a mitad de camino, se busca en el equipo.
        try {
          const found = await searchOffline(trimmed);
          if (!cancelled) setResults(found);
        } catch {
          if (!cancelled) setMessage("No se pudo buscar. Revisa la conexión e intenta de nuevo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [trimmed, isOnline]);

  function add(product: PosProduct) {
    if (product.stock <= 0) return;
    onAdd(product);
    setQuery("");
    setResults(null);
    setMessage(null);
  }

  /** Código exacto (lector USB o cámara) → se agrega directo. */
  async function lookup(code: string, refocus = true) {
    if (!code) return;
    lookupRef.current?.abort();
    const controller = new AbortController();
    lookupRef.current = controller;
    try {
      let product: PosProduct | null = null;
      if (isOnline) {
        const response = await fetch(`/api/products/qr/${encodeURIComponent(code)}`, { signal: controller.signal });
        if (response.ok) product = compact((await response.json()) as PosProduct);
        else if (response.status !== 404) throw new Error("lookup");
      }
      if (!product) {
        const local = await getOfflineDb().products.where("qr_code").equals(code).first();
        product = local && !local.deleted ? toPosProduct(local) : null;
      }
      if (controller.signal.aborted) return;
      if (!product) {
        // No es un código: si son 3+ letras, quedan los resultados por nombre.
        if (code.length < MIN_PRODUCT_SEARCH_LENGTH || /^\d+$/.test(code)) setMessage(`No hay producto con el código "${code}".`);
        return;
      }
      if (product.stock <= 0) {
        setMessage(`${product.name} no tiene stock.`);
        return;
      }
      add(product);
    } catch {
      if (!controller.signal.aborted) setMessage("No se pudo buscar el código. Intenta de nuevo.");
    } finally {
      if (refocus) window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  const showingTop = results === null && topProducts.length > 0 && trimmed.length < MIN_PRODUCT_SEARCH_LENGTH;
  const list = results ?? (showingTop ? topProducts : []);

  return (
    <section aria-label="Buscar productos" className="flex min-w-0 flex-col gap-3">
      <div className="flex gap-2">
        <label className="flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-control border border-app-borderStrong bg-app-surface px-3 focus-within:ring-2 focus-within:ring-focus">
          <Search className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
          <span className="sr-only">Buscar producto o escanear código</span>
          <input
            ref={inputRef}
            id="pos-search"
            type="search"
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            placeholder="Buscar o escanear"
            onChange={(event) => {
              setQuery(event.target.value);
              setMessage(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void lookup(trimmed);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-base text-text-strong outline-none placeholder:text-text-muted"
          />
          <kbd className="hidden rounded border border-app-border px-1.5 text-xs text-text-muted lg:inline" aria-hidden="true">
            /
          </kbd>
        </label>
        {canUseCamera ? (
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="inline-flex h-[52px] shrink-0 items-center gap-2 rounded-control border border-app-borderStrong bg-app-surface px-3 text-sm font-bold text-text-strong hover:bg-app-surface-muted"
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
            <span className="max-sm:sr-only">Cámara</span>
          </button>
        ) : null}
      </div>

      {!isOnline ? (
        <p className="rounded-control border border-status-warningBorder bg-status-warningBg px-3 py-2 text-sm text-status-warning">
          Busca en los productos guardados en este equipo. Las ventas se envían al volver internet.
        </p>
      ) : null}
      {trimmed && trimmed.length < MIN_PRODUCT_SEARCH_LENGTH && !message ? (
        <p role="status" className="text-sm text-text-muted">
          Escribe al menos {MIN_PRODUCT_SEARCH_LENGTH} letras, o escanea el código y presiona Enter.
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm font-semibold text-status-danger">
          {message}
        </p>
      ) : null}

      {showingTop ? (
        <div>
          <h2 className="text-sm font-bold text-text-strong">Más vendidos</h2>
          <p className="text-xs text-text-muted">Toca para agregar · escribe para buscar en todos</p>
        </div>
      ) : results !== null ? (
        <p className="text-sm text-text-muted" aria-live="polite">
          {loading ? "Buscando…" : results.length === 1 ? "1 resultado" : `${results.length} resultados`}
        </p>
      ) : loading ? (
        <p className="text-sm text-text-muted">Buscando…</p>
      ) : null}

      {list.length > 0 ? (
        <ul className={`grid gap-2 ${showingTop ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" : ""}`} aria-label={showingTop ? "Más vendidos" : "Resultados"}>
          {list.map((product) => (
            <li key={product.id}>
              <ProductTile product={product} compact={showingTop} inCart={inCart(product.id)} onAdd={() => add(product)} />
            </li>
          ))}
        </ul>
      ) : results !== null && !loading ? (
        <p className="rounded-card border border-dashed border-app-borderStrong p-4 text-center text-sm text-text-muted">
          Ningún producto con &quot;{trimmed}&quot;.
        </p>
      ) : null}

      <PosCameraScanner
        open={scanning}
        onOpenChange={setScanning}
        onDetected={(code) => {
          setScanning(false);
          setQuery(code);
          // Sin volver a enfocar: en el celular abriría el teclado.
          void lookup(code, false);
        }}
        onTypeCode={() => window.setTimeout(() => inputRef.current?.focus(), 0)}
      />
    </section>
  );
});

function ProductTile({
  product,
  compact,
  inCart,
  onAdd,
}: {
  product: PosProduct;
  compact: boolean;
  inCart: number;
  onAdd: () => void;
}) {
  const out = product.stock <= 0;
  const full = inCart >= product.stock;
  const discounted = Number(product.effective_price) < Number(product.price);
  const place = product.locations?.find((location) => location.kind === "display")?.label ?? product.locations?.[0]?.label;
  const disabled = out || full;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`${product.name}${out ? ", sin stock" : full ? ", ya llevas todo el stock" : `, agregar por ${formatCurrency(product.effective_price)}`}`}
      className={`flex w-full items-center gap-3 rounded-[14px] border bg-app-surface p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-focus ${
        disabled ? "cursor-not-allowed border-app-border opacity-60" : "border-app-border hover:border-brand-700"
      } ${compact ? "min-h-[84px] flex-col items-start gap-1" : "min-h-[64px]"}`}
    >
      <span className={`min-w-0 ${compact ? "w-full" : "flex-1"}`}>
        <strong className={`block text-[15px] text-text-strong ${compact ? "line-clamp-2 text-left" : "truncate"}`}>{product.name}</strong>
        {compact ? null : (
          <span className="flex min-w-0 items-center gap-1 text-xs text-text-muted">
            {place ? (
              <>
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{place}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span className={out ? "font-bold text-status-danger" : product.stock <= 3 ? "font-semibold text-status-warning" : ""}>
              {out ? "Sin stock" : `Stock ${product.stock}`}
            </span>
            {product.qr_code ? <span className="truncate font-mono max-sm:hidden">· {product.qr_code}</span> : null}
          </span>
        )}
      </span>
      {compact ? (
        <span className="flex w-full flex-wrap items-baseline justify-between gap-x-2">
          <span className="font-bold text-text-strong">
            {formatCurrency(product.effective_price)}
            {discounted ? <span className="ml-1 text-xs font-normal text-text-muted line-through">{formatCurrency(product.price)}</span> : null}
          </span>
          {out || inCart > 0 ? (
            <span className={`text-xs ${out ? "font-bold text-status-danger" : "font-semibold text-brand-700"}`}>
              {out ? "Sin stock" : `${inCart} en la venta`}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="shrink-0 text-right">
          <span className="block font-bold text-text-strong">{formatCurrency(product.effective_price)}</span>
          {discounted ? <span className="block text-xs text-text-muted line-through">{formatCurrency(product.price)}</span> : null}
        </span>
      )}
    </button>
  );
}

async function searchOnline(query: string): Promise<PosProduct[]> {
  const response = await fetch(`/api/products/pos?q=${encodeURIComponent(query)}&limit=20&offset=0`);
  if (!response.ok) throw new Error("search");
  const data = (await response.json()) as PosProductListResponse;
  return data.items.map(compact);
}

async function searchOffline(query: string): Promise<PosProduct[]> {
  const lower = query.toLowerCase();
  const matches = await getOfflineDb()
    .products.filter(
      (product) =>
        !product.deleted && (product.name.toLowerCase().includes(lower) || (product.qr_code ?? "").toLowerCase() === lower),
    )
    .limit(20)
    .toArray();
  return matches.map(toPosProduct);
}

function compact(product: PosProduct): PosProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    unit: product.unit,
    qr_code: product.qr_code ?? null,
    discount_type: product.discount_type ?? null,
    discount_value: product.discount_value ?? "0",
    effective_price: product.effective_price ?? product.price,
    locations: product.locations?.map(({ label, kind }) => ({ label, kind })) ?? [],
  };
}
