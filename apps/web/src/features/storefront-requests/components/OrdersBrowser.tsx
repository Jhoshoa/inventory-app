"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { MoreParentLink } from "@/components/layout/MoreParentLink";
import { Button } from "@/components/ui/Button";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { readErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/format/currency";
import { formatPhone } from "@/lib/format/phone";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import {
  DELIVERY_SHORT,
  ORDER_TABS,
  catalogUrl,
  moveCount,
  orderLine,
  orderSummary,
  receivedAt,
  relativeTime,
  statusCounts,
  type OrderTab,
  type StatusCounts,
} from "../list";
import type { StorefrontRequestListResponse, StorefrontRequestResponse } from "../types";
import { OrderPaymentBadge, OrderStatusBadge } from "./OrderBadges";
import { OrderDetail } from "./OrderDetail";

const PAGE_SIZE = 50;

function listUrl(tab: OrderTab, offset = 0) {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (tab !== "all") query.set("status", tab);
  return `/api/storefront-requests?${query.toString()}`;
}

async function fetchList(tab: OrderTab, offset: number, signal?: AbortSignal) {
  const response = await fetch(listUrl(tab, offset), { signal, cache: "no-store" });
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudieron cargar los pedidos"));
  return (await response.json()) as StorefrontRequestListResponse;
}

/** Hora actual para "hace 25 min"; se fija al montar (en el servidor se muestra la hora). */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * Pedidos del catálogo (tablero P07). Pestañas por estado con su conteo (B7). Celular:
 * tarjetas y el detalle en una hoja. Desde 768 px: tabla; el detalle al costado desde
 * 1280 px y en una ventana lateral más angosto.
 */
export function OrdersBrowser({
  initialTab,
  initialData,
  storeName,
  catalogSlug,
  canManageCatalog,
}: {
  initialTab: OrderTab;
  initialData: StorefrontRequestListResponse;
  storeName: string;
  /** Dirección del catálogo; null si está apagado o sin dirección. */
  catalogSlug: string | null;
  /** El dueño puede ir a activar el catálogo (el cajero no ve Configuración). */
  canManageCatalog: boolean;
}) {
  const [tab, setTab] = useState(initialTab);
  const [requests, setRequests] = useState(initialData.items);
  const [total, setTotal] = useState(initialData.total);
  const [counts, setCounts] = useState<StatusCounts | null>(statusCounts(initialData));
  const [pendingCount, setPendingCount] = useState(initialData.pending_count);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const wide = useMediaQuery("(min-width: 1280px)");
  const tablet = useMediaQuery("(min-width: 768px)");
  const now = useNow();
  const selected = requests.find((request) => request.id === selectedId) ?? null;

  const load = useCallback(async (next: OrderTab) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchList(next, 0, controller.signal);
      if (controller.signal.aborted) return;
      setRequests(data.items);
      setTotal(data.total);
      setCounts(statusCounts(data));
      setPendingCount(data.pending_count);
    } catch (fetchError) {
      if (controller.signal.aborted) return;
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los pedidos");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  // Escape cierra el detalle al costado (la ventana se cierra sola).
  useEffect(() => {
    if (!selectedId || !wide) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("[role='dialog']")) setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, wide]);

  function changeTab(next: OrderTab) {
    if (next === tab) return;
    setTab(next);
    setSelectedId(null);
    window.history.replaceState(null, "", next === "pending" ? "?" : `?estado=${next}`);
    void load(next);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await fetchList(tab, requests.length);
      setRequests((current) => [...current, ...data.items.filter((item) => !current.some((request) => request.id === item.id))]);
      setTotal(data.total);
    } catch (fetchError) {
      toast.error(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar más pedidos");
    } finally {
      setLoadingMore(false);
    }
  }

  // El pedido queda en la lista aunque cambie de estado (no desaparece mientras se mira);
  // los conteos se ajustan aquí: pedirlos enseguida puede traer los de antes (E15).
  function updateRequest(updated: StorefrontRequestResponse, previous: StorefrontRequestResponse) {
    setRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
    if (previous.status !== updated.status) {
      setCounts((current) => moveCount(current, previous.status, updated.status));
      setPendingCount((current) =>
        Math.max(current + (updated.status === "pending" ? 1 : 0) - (previous.status === "pending" ? 1 : 0), 0),
      );
    }
  }

  async function copyCatalogLink() {
    if (!catalogSlug) return;
    try {
      await navigator.clipboard.writeText(catalogUrl(catalogSlug, window.location.origin));
      toast.success("Link del catálogo copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  }

  const detail = selected ? (
    <OrderDetail request={selected} storeName={storeName} now={now ?? Date.parse(selected.created_at)} onUpdated={updateRequest} />
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0">
          <MoreParentLink />
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Pedidos</h1>
          <p className="text-sm text-text-muted">
            <span className="md:hidden">Lo que te piden desde tu catálogo</span>
            <span className="max-md:hidden">
              {pendingCount === 0 ? "Nada pendiente de responder" : `${pendingCount} ${pendingCount === 1 ? "pendiente" : "pendientes"} de responder`}
            </span>
          </p>
        </div>
        {catalogSlug ? (
          <Button variant="secondary" className="max-md:hidden" onClick={copyCatalogLink}>
            <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
            Copiar link del catálogo
          </Button>
        ) : null}
      </header>

      <div role="tablist" aria-label="Estado del pedido" className="flex flex-wrap gap-1.5 max-[359px]:gap-1">
        {ORDER_TABS.map((item) => {
          const count = item.value === "all" ? null : counts?.[item.value] ?? (item.value === "pending" ? pendingCount : null);
          // Como en el tablero: los cerrados no llevan número (solo crecen).
          const showCount = count !== null && item.value !== "closed" && count > 0;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => changeTab(item.value)}
              className={`inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-focus max-[359px]:px-2 max-[359px]:text-xs ${
                tab === item.value ? "border-text-strong bg-text-strong text-text-inverse" : "border-app-borderStrong bg-app-surface text-text-body hover:bg-app-surface-muted"
              } ${item.value === "all" && tab !== "all" ? "max-md:hidden" : ""}`}
            >
              {item.label}
              {showCount ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      {error ? (
        <DataFetchError resource="los pedidos" error={error} onRetry={() => void load(tab)} />
      ) : loading ? (
        <ListSkeleton />
      ) : requests.length === 0 ? (
        <EmptyOrders tab={tab} catalogSlug={catalogSlug} canManageCatalog={canManageCatalog} onCopy={copyCatalogLink} />
      ) : (
        <div className={`grid grid-cols-[minmax(0,1fr)] items-start gap-4 ${selected && wide ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
          <div className="flex min-w-0 flex-col gap-3">
            <PhoneList requests={requests} now={now} onSelect={setSelectedId} />
            <OrdersTable
              requests={requests}
              now={now}
              selectedId={selectedId}
              compact={Boolean(selected && wide)}
              onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
            />
            {requests.length < total ? (
              <Button variant="secondary" className="self-center" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Cargando…" : `Ver más pedidos (${requests.length} de ${total})`}
              </Button>
            ) : null}
          </div>
          {selected && wide ? (
            <aside aria-label="Detalle del pedido" className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-3 overflow-y-auto rounded-card border border-app-border bg-app-surface p-[18px]">
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 break-words text-[17px] font-extrabold text-text-strong">{selected.customer_name}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Cerrar detalle"
                  className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-text-muted hover:bg-app-surface-muted hover:text-text-strong"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {detail}
            </aside>
          ) : null}
        </div>
      )}

      {selected && !wide ? (
        <Dialog open onOpenChange={(open) => !open && setSelectedId(null)} position={tablet ? "right" : "sheet"} size="md" className={tablet ? "!max-w-[400px]" : ""}>
          <DialogTitle close>{selected.customer_name}</DialogTitle>
          <DialogBody className="pb-5">{detail}</DialogBody>
        </Dialog>
      ) : null}
    </div>
  );
}

function PhoneList({
  requests,
  now,
  onSelect,
}: {
  requests: StorefrontRequestResponse[];
  now: number | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2 md:hidden">
      {requests.map((request) => (
        <li key={request.id}>
          <button
            type="button"
            onClick={() => onSelect(request.id)}
            className="flex w-full flex-col gap-1.5 rounded-card border border-app-border bg-app-surface px-3.5 py-3 text-left hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="flex w-full items-baseline justify-between gap-3">
              <strong className="min-w-0 truncate text-[15px] text-text-strong">{request.customer_name}</strong>
              <span className="shrink-0 text-xs text-text-muted">
                {now ? relativeTime(request.created_at, now) : receivedAt(request.created_at, Date.parse(request.created_at))}
              </span>
            </span>
            <span className="flex w-full items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] text-text-muted">{orderLine(request)}</span>
              {request.total ? <strong className="shrink-0 tabular-nums text-text-strong">{formatCurrency(request.total)}</strong> : null}
            </span>
            <span className="flex gap-1.5">
              <OrderStatusBadge status={request.status} />
              <OrderPaymentBadge paid={request.payment_confirmed} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function OrdersTable({
  requests,
  now,
  selectedId,
  compact,
  onSelect,
}: {
  requests: StorefrontRequestResponse[];
  now: number | null;
  selectedId: string | null;
  /** Con el detalle al costado: sin Entrega ni Recibido (están en el detalle). */
  compact: boolean;
  onSelect: (id: string) => void;
}) {
  const wideOnly = compact ? "hidden" : "";
  return (
    <div className="overflow-hidden rounded-card border border-app-border bg-app-surface max-md:hidden">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-app-surface-muted text-left text-xs font-semibold text-text-muted">
          <tr>
            <th scope="col" className="px-3 py-2.5">Cliente</th>
            <th scope="col" className="px-3 py-2.5">Pedido</th>
            <th scope="col" className={`w-[84px] px-3 py-2.5 ${wideOnly}`}>Entrega</th>
            <th scope="col" className="w-[96px] px-3 py-2.5">Pago</th>
            <th scope="col" className="w-[100px] px-3 py-2.5 text-right">Total</th>
            <th scope="col" className={`w-[104px] px-3 py-2.5 ${wideOnly}`}>Recibido</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {requests.map((request) => {
            const isSelected = request.id === selectedId;
            return (
              <tr key={request.id} onClick={() => onSelect(request.id)} className={`cursor-pointer ${isSelected ? "bg-brand-50" : "hover:bg-app-surface-muted"}`}>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    aria-current={isSelected ? "true" : undefined}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(request.id);
                    }}
                    className="block w-full min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <span className="flex items-center gap-1.5">
                      <strong className="truncate text-text-strong">{request.customer_name}</strong>
                      {request.status !== "pending" ? <OrderStatusBadge status={request.status} className="shrink-0 !px-2" /> : null}
                    </span>
                    <span className="block truncate text-xs text-text-muted">{formatPhone(request.customer_phone)}</span>
                  </button>
                </td>
                <td className="truncate px-3 py-2.5 text-text-body">{orderSummary(request)}</td>
                <td className={`px-3 py-2.5 text-text-body ${wideOnly}`}>{request.delivery_method ? DELIVERY_SHORT[request.delivery_method] : "—"}</td>
                <td className="px-3 py-2.5">
                  <OrderPaymentBadge paid={request.payment_confirmed} />
                </td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums text-text-strong">{request.total ? formatCurrency(request.total) : "—"}</td>
                <td className={`px-3 py-2.5 text-xs text-text-muted ${wideOnly}`}>
                  {now ? relativeTime(request.created_at, now) : receivedAt(request.created_at, Date.parse(request.created_at))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyOrders({
  tab,
  catalogSlug,
  canManageCatalog,
  onCopy,
}: {
  tab: OrderTab;
  catalogSlug: string | null;
  canManageCatalog: boolean;
  onCopy: () => void;
}) {
  const title =
    tab === "pending"
      ? "No tienes pedidos por responder"
      : tab === "contacted"
        ? "Sin pedidos contactados"
        : tab === "closed"
          ? "Sin pedidos cerrados"
          : "Todavía no llegaron pedidos";
  const share = tab === "pending" || tab === "all";
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-app-border bg-app-surface px-6 py-10 text-center">
      <Inbox className="h-8 w-8 text-text-muted" aria-hidden="true" />
      <p className="font-bold text-text-strong">{title}</p>
      {share ? (
        <>
          <p className="text-sm text-text-muted">Comparte tu catálogo para que te lleguen pedidos.</p>
          {catalogSlug ? (
            <Button className="mt-1" onClick={onCopy}>
              <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
              Copiar link
            </Button>
          ) : canManageCatalog ? (
            <Button asChild variant="secondary" className="mt-1">
              <Link href="/dashboard/settings/catalogo">Activar el catálogo</Link>
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando pedidos" className="flex flex-col gap-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-card border border-app-border bg-app-surface px-4 py-3">
          <span className="h-4 w-40 animate-pulse rounded bg-app-surface-muted" />
          <span className="h-3 w-56 animate-pulse rounded bg-app-surface-muted" />
        </div>
      ))}
    </div>
  );
}
