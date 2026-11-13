"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ChevronLeft, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/format/currency";
import { useConnectionStatus } from "@/lib/offline/useConnectionStatus";
import { loadTopProducts } from "../catalog";
import { loadOrderProducts, resolveOrderItems, takeOrderForPos } from "../order";
import {
  calculateCartTotal,
  calculateProductDiscountTotal,
  initialCartState,
  posCartReducer,
  type ManualDiscountPolicy,
} from "../schemas";
import type { CartItem, PosProduct } from "../types";
import { CHECKOUT_FORM_ID, PosCheckout, type FinishedSale } from "./PosCheckout";
import { PosDone } from "./PosDone";
import { PosSaleItems } from "./PosSaleItems";
import { PosSearch, type PosSearchHandle } from "./PosSearch";

type View = "search" | "sale" | "checkout";

/** Cuánto se ve "Agregado: X · Deshacer". */
const UNDO_MS = 6000;

/**
 * Vender (tableros A · POS en escritorio y celular). Escritorio: buscar a la izquierda,
 * venta y cobro a la derecha; atajos "/" (buscar) y F9 (cobrar). Celular: Buscar →
 * Venta actual → Cobrar, con barra fija "Ver venta · Cobrar" en lugar de las pestañas.
 */
export function PosScreen({
  policy,
  storeName,
  sellerName,
  topProductIds,
  orderId = null,
}: {
  policy: ManualDiscountPolicy;
  storeName: string;
  sellerName: string | null;
  /** Más vendidos de los últimos 30 días; null si el reporte no respondió (se usan los guardados). */
  topProductIds: string[] | null;
  /** ?pedido=: el pedido del catálogo que se cobra (Cobrar en Vender, tablero P07). */
  orderId?: string | null;
}) {
  const [cart, dispatch] = useReducer(posCartReducer, initialCartState);
  const [view, setView] = useState<View>("search");
  const [finished, setFinished] = useState<FinishedSale | null>(null);
  const [lastAdded, setLastAdded] = useState<{ name: string; previous: CartItem[] } | null>(null);
  const [topProducts, setTopProducts] = useState<PosProduct[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [order, setOrder] = useState<{ id: string; customerName: string; notes: string[] } | null>(null);
  const searchRef = useRef<PosSearchHandle>(null);
  const connection = useConnectionStatus();

  const items = cart.items;
  const units = items.reduce((count, item) => count + item.quantity, 0);
  const subtotal = calculateCartTotal(items);
  const estimatedTotal = Math.max(subtotal - calculateProductDiscountTotal(items), 0);

  // Los más vendidos salen del catálogo guardado: se vuelven a leer cuando termina un sync.
  useEffect(() => {
    if (connection.isSyncing) return;
    let cancelled = false;
    void loadTopProducts(topProductIds).then((products) => {
      if (!cancelled) setTopProducts(products);
    });
    return () => {
      cancelled = true;
    };
  }, [topProductIds, connection.isSyncing, connection.lastSyncedAt]);

  // Cobrar en Vender: el pedido se toma una sola vez; lo borrado o sin stock se avisa y no entra.
  const orderLoadedRef = useRef(false);
  useEffect(() => {
    if (!orderId || orderLoadedRef.current) return;
    orderLoadedRef.current = true;
    const saved = takeOrderForPos(orderId);
    if (!saved) {
      toast.error("No se encontró el pedido. Ábrelo de nuevo desde Pedidos y toca Cobrar en Vender.");
      return;
    }
    const ids = saved.items.flatMap((item) => (item.productId ? [item.productId] : []));
    void loadOrderProducts(ids, navigator.onLine).then((products) => {
      const resolved = resolveOrderItems(saved, products);
      dispatch({ type: "restore", items: resolved.items });
      setOrder({ id: saved.id, customerName: saved.customerName, notes: resolved.notes });
      if (resolved.items.length > 0) setView("sale");
    });
  }, [orderId]);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = window.setTimeout(() => setLastAdded(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [lastAdded]);

  const add = useCallback(
    (product: PosProduct) => {
      setLastAdded({ name: product.name, previous: cart.items });
      dispatch({ type: "add", product });
      window.setTimeout(() => searchRef.current?.focus(), 0);
    },
    [cart.items],
  );

  // Atajos de escritorio: "/" busca y F9 cobra (F2 abre Vender desde cualquier página).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !typing && !finished) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "F9" && !finished && items.length > 0) {
        event.preventDefault();
        (document.getElementById(CHECKOUT_FORM_ID) as HTMLFormElement | null)?.requestSubmit();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [finished, items.length]);

  function newSale() {
    setFinished(null);
    if (order) {
      setOrder(null);
      window.history.replaceState(null, "", "/dashboard/pos");
    }
    setView("search");
    setLastAdded(null);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }

  const status = connection.isOnline
    ? connection.pendingCount > 0
      ? `En línea · enviando ${connection.pendingCount}`
      : "En línea · todo enviado"
    : `Sin conexión${connection.pendingCount > 0 ? ` · ${connection.pendingCount} por enviar` : ""}`;

  if (finished) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-2">
        <PosDone finished={finished} storeName={storeName} sellerName={sellerName} order={order} onNewSale={newSale} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-28 lg:pb-4">
      <header className={`flex items-center justify-between gap-3 ${view === "search" ? "" : "max-lg:hidden"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Vender</h1>
          <span
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold ${
              connection.isOnline ? "border-app-border text-text-muted" : "border-status-warningBorder bg-status-warningBg text-status-warning"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${connection.isOnline ? "bg-[#12B76A]" : "bg-status-warning"}`} aria-hidden="true" />
            {status}
          </span>
        </div>
        <Link
          href="/dashboard"
          aria-label="Salir de Vender"
          className="flex h-11 w-11 items-center justify-center rounded-control border border-app-borderStrong text-text-body lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
      </header>

      {order ? (
        <div role="status" className="flex items-start gap-3 rounded-card border border-status-infoBorder bg-status-infoBg px-3.5 py-2.5 text-sm text-status-info">
          <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Cobrando el pedido de {order.customerName}</p>
            {order.notes.length > 0 ? (
              <ul className="mt-0.5 list-disc pl-4 text-text-body">
                {order.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className={`flex min-w-0 flex-col gap-3 ${view === "search" ? "" : "max-lg:hidden"}`}>
          <PosSearch
            ref={searchRef}
            isOnline={connection.isOnline}
            topProducts={topProducts}
            onAdd={add}
            inCart={(productId) => items.find((item) => item.product.id === productId)?.quantity ?? 0}
          />
        </div>

        <aside
          aria-label="Venta actual"
          className={`flex min-w-0 flex-col gap-3 rounded-card border border-app-border bg-app-surface p-4 lg:sticky lg:top-4 ${
            view === "search" ? "max-lg:hidden" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setView(view === "checkout" ? "sale" : "search")}
                aria-label={view === "checkout" ? "Volver a la venta" : "Seguir buscando"}
                className="-ml-2 flex h-10 w-10 items-center justify-center rounded-control lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold text-text-strong">
                  <span className={view === "checkout" ? "lg:hidden" : "hidden"}>Cobrar</span>
                  <span className={view === "checkout" ? "max-lg:hidden" : ""}>Venta actual</span>
                </h2>
                <p className="text-xs text-text-muted">
                  {items.length === 1 ? "1 producto" : `${items.length} productos`} · {units === 1 ? "1 unidad" : `${units} unidades`}
                </p>
              </div>
            </div>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className={`h-9 rounded-control px-2 text-sm font-bold text-status-danger hover:bg-app-surface-muted ${view === "checkout" ? "max-lg:hidden" : ""}`}
              >
                Vaciar
              </button>
            ) : null}
          </div>

          <div className={view === "checkout" ? "max-lg:hidden" : ""}>
            <PosSaleItems
              items={items}
              onIncrement={(productId) => dispatch({ type: "increment", productId })}
              onDecrement={(productId) => dispatch({ type: "decrement", productId })}
              onQuantityChange={(productId, quantity) => dispatch({ type: "setQuantity", productId, quantity })}
              onRemove={(productId) => dispatch({ type: "remove", productId })}
            />
          </div>

          {/* Celular: la venta actual tiene su total y "Ir a cobrar"; el cobro es otra vista. */}
          {view === "sale" ? (
            <div className="flex flex-col gap-2 border-t border-app-border pt-3 lg:hidden">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-muted">Total</span>
                <strong className="text-xl font-extrabold tabular-nums text-text-strong">{formatCurrency(estimatedTotal)}</strong>
              </div>
              <Button className="!h-[52px] text-base" disabled={items.length === 0} onClick={() => setView("checkout")}>
                Ir a cobrar
              </Button>
            </div>
          ) : null}

          <div className={view === "checkout" ? "" : "max-lg:hidden"}>
            <PosCheckout
              items={items}
              policy={policy}
              isOnline={connection.isOnline}
              customerName={order?.customerName}
              onStockChanged={(products) => {
                dispatch({ type: "syncProducts", products });
                setView("sale");
              }}
              onFinished={(sale) => {
                dispatch({ type: "clear" });
                setFinished(sale);
                void connection.refreshCounts();
              }}
            />
          </div>
        </aside>
      </div>

      {lastAdded ? (
        <div
          role="status"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-card bg-text-strong px-4 py-3 text-sm text-text-inverse shadow-floating lg:bottom-6"
        >
          <span className="min-w-0 truncate">
            Agregado: <strong>{lastAdded.name}</strong>
            <span className="max-sm:hidden"> · el buscador sigue listo para el siguiente código</span>
          </span>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "restore", items: lastAdded.previous });
              setLastAdded(null);
              searchRef.current?.focus();
            }}
            className="shrink-0 font-bold text-[#FFE14D] underline-offset-2 hover:underline"
          >
            Deshacer
          </button>
        </div>
      ) : null}

      {/* Celular: barra fija en lugar de la barra de pestañas (tablero A · POS buscar). */}
      {view === "search" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-app-border bg-app-surface px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 lg:hidden">
          <button
            type="button"
            onClick={() => setView("sale")}
            className="relative flex h-[52px] flex-1 flex-col items-center justify-center rounded-control border border-app-borderStrong text-sm font-bold text-text-strong"
          >
            Ver venta
            <span className="text-xs font-normal text-text-muted">{items.length === 1 ? "1 producto" : `${items.length} productos`}</span>
            {units > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-700 px-1.5 text-xs font-bold text-text-inverse" aria-hidden="true">
                {units}
              </span>
            ) : null}
          </button>
          <Button className="!h-[52px] flex-[1.4] text-base" disabled={items.length === 0} onClick={() => setView("checkout")}>
            Cobrar {formatCurrency(estimatedTotal)}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="¿Vaciar la venta?"
        description="Se quitan todos los productos de la venta actual."
        confirmLabel="Vaciar"
        onConfirm={() => {
          dispatch({ type: "clear" });
          setConfirmClear(false);
          setView("search");
        }}
      />
    </div>
  );
}
