"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { readErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/format/currency";
import { formatTimeShort } from "@/lib/format/datetime";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { canExport } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import type { SalesReport } from "@/features/reports/types";
import {
  dayHeading,
  exportHref,
  groupSalesByDay,
  itemsSummary,
  paymentLabel,
  rangeLabel,
  toSalesSummary,
  type SalesSummary,
} from "../list";
import { DEFAULT_SALE_LIMIT, buildSalesApiQuery } from "../schemas";
import type { Sale, SaleListResponse } from "../types";
import type { ReceiptStoreInfo } from "./SaleReceipt";
import { SaleSidePanel } from "./SaleSidePanel";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { SalesFilters, type SalesFilterValue } from "./SalesFilters";

const wholeFormatter = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 });
const centsFormatter = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "742" o "318,50" (sin "Bs", como en el resumen del tablero). */
function shortAmount(value: number) {
  return Number.isInteger(value) ? wholeFormatter.format(value) : centsFormatter.format(value);
}

function filterQuery(filters: SalesFilterValue, offset = 0) {
  return buildSalesApiQuery({ ...filters, limit: DEFAULT_SALE_LIMIT, offset });
}

async function fetchJson<T>(url: string, signal: AbortSignal, fallback: string): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(await readErrorMessage(response, fallback));
  return (await response.json()) as T;
}

async function fetchSummary(filters: SalesFilterValue, signal: AbortSignal) {
  const range = new URLSearchParams({ from_date: filters.from_date, to_date: filters.to_date });
  const [report, voided] = await Promise.all([
    fetchJson<SalesReport>(`/api/reports/sales?${range}`, signal, "").catch(() => null),
    fetchJson<SaleListResponse>(`/api/sales?${range}&status=voided&limit=1&offset=0`, signal, "")
      .then((result) => result.total)
      .catch(() => null),
  ]);
  return toSalesSummary(report, voided);
}

/**
 * Ventas (tablero P06). Celular: resumen del rango y lista por día con su total; tocar
 * abre la página de la venta. Desde 768 px: tabla; la fila abre el detalle al costado
 * sin salir de la lista. Los filtros quedan en la dirección para recargar o compartir.
 */
export function SalesBrowser({
  initialFilters,
  initialData,
  initialSummary,
  role,
  store,
  today,
}: {
  initialFilters: SalesFilterValue;
  initialData: SaleListResponse;
  initialSummary: SalesSummary | null;
  role: UserRole;
  store: ReceiptStoreInfo;
  today: string;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [sales, setSales] = useState(initialData.items);
  const [total, setTotal] = useState(initialData.total);
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  // Desde 1280 px el detalle va al costado; más angosto, en una ventana lateral.
  const wide = useMediaQuery("(min-width: 1280px)");
  const firstBusinessDate = initialData.first_business_date;
  const selected = sales.find((sale) => sale.id === selectedId) ?? null;

  const load = useCallback(async (next: SalesFilterValue) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const [list, nextSummary] = await Promise.all([
        fetchJson<SaleListResponse>(`/api/sales?${filterQuery(next)}`, controller.signal, "No se pudieron cargar las ventas"),
        fetchSummary(next, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setSales(list.items);
      setTotal(list.total);
      setSummary(nextSummary);
    } catch (fetchError) {
      if (controller.signal.aborted) return;
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las ventas");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function changeFilters(next: SalesFilterValue) {
    setFilters(next);
    setSelectedId(null);
    const query = new URLSearchParams({ from_date: next.from_date, to_date: next.to_date });
    if (next.status !== "all") query.set("status", next.status);
    window.history.replaceState(null, "", `?${query.toString()}`);
    void load(next);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const controller = new AbortController();
      const list = await fetchJson<SaleListResponse>(
        `/api/sales?${filterQuery(filters, sales.length)}`,
        controller.signal,
        "No se pudieron cargar más ventas",
      );
      setSales((current) => [...current, ...list.items.filter((item) => !current.some((sale) => sale.id === item.id))]);
      setTotal(list.total);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar más ventas");
    } finally {
      setLoadingMore(false);
    }
  }

  function replaceSale(updated: Sale) {
    const previous = sales.find((sale) => sale.id === updated.id);
    setSales((current) => current.map((sale) => (sale.id === updated.id ? updated : sale)));
    // Recién anulada: los totales se ajustan aquí, sin volver a pedir el reporte.
    if (previous?.status === "completed" && updated.status === "voided") {
      setSummary((current) => (current ? withoutSale(current, updated) : current));
    }
  }

  async function reloadSale(id: string) {
    try {
      const response = await fetch(`/api/sales/${id}`, { cache: "no-store" });
      if (response.ok) replaceSale((await response.json()) as Sale);
    } catch {
      // Sin conexión: queda como estaba.
    }
  }

  // Escape cierra el detalle al costado (la ventana lateral se cierra sola).
  useEffect(() => {
    if (!selectedId || !wide) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("[role='dialog']")) setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, wide]);

  const label = rangeLabel(filters.from_date, filters.to_date, today, firstBusinessDate);
  const groups = groupSalesByDay(sales);
  const multiDay = filters.from_date !== filters.to_date;
  const owner = canExport(role);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Ventas</h1>
          {summary ? <p className="text-sm text-text-muted max-md:hidden">{summaryLine(summary)}</p> : null}
        </div>
        {owner ? (
          <Button variant="secondary" asChild className="max-md:!h-[34px] max-md:px-2.5 max-md:text-[13px]">
            <a href={exportHref(filters)} download>
              Exportar<span className="max-md:hidden"> CSV</span>
            </a>
          </Button>
        ) : null}
      </header>

      <SalesFilters
        value={filters}
        today={today}
        firstBusinessDate={firstBusinessDate}
        voidedCount={summary?.voided ?? null}
        onChange={changeFilters}
      />

      {summary ? <SummaryCard summary={summary} label={label} /> : null}

      {error ? (
        <DataFetchError resource="las ventas" error={error} onRetry={() => void load(filters)} />
      ) : loading ? (
        <ListSkeleton />
      ) : sales.length === 0 ? (
        <EmptySales filters={filters} label={label} />
      ) : (
        <div className={`grid grid-cols-[minmax(0,1fr)] items-start gap-4 ${selected && wide ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
          <div className="flex min-w-0 flex-col gap-3">
            <PhoneList groups={groups} />
            <SalesTable
              groups={groups}
              multiDay={multiDay}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
            />
            {sales.length < total ? (
              <Button variant="secondary" className="self-center" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Cargando…" : `Ver más ventas (${sales.length} de ${total})`}
              </Button>
            ) : null}
          </div>
          {selected ? (
            <SaleSidePanel
              key={selected.id}
              sale={selected}
              role={role}
              store={store}
              today={today}
              asDrawer={!wide}
              onClose={() => setSelectedId(null)}
              onVoided={replaceSale}
              onConflict={() => void reloadSale(selected.id)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

/** El resumen sin una venta que se acaba de anular. */
function withoutSale(summary: SalesSummary, sale: Sale): SalesSummary {
  const amount = Number(sale.total);
  return {
    count: Math.max(summary.count - 1, 0),
    total: Math.max(summary.total - amount, 0),
    byMethod: summary.byMethod
      .map((item) => (item.method === sale.payment_method ? { ...item, total: Math.max(item.total - amount, 0) } : item))
      .filter((item) => item.total > 0),
    voided: summary.voided === null ? null : summary.voided + 1,
  };
}

function summaryLine(summary: SalesSummary) {
  const parts = [summary.count === 1 ? "1 venta" : `${summary.count} ventas`, formatCurrency(summary.total)];
  if (summary.voided) parts.push(summary.voided === 1 ? "1 anulada" : `${summary.voided} anuladas`);
  return parts.join(" · ");
}

/** Celular: "Hoy · 37 ventas / Bs 1.248,50" y los dos métodos que más suman. */
function SummaryCard({ summary, label }: { summary: SalesSummary; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-app-border bg-app-surface px-4 py-3 md:hidden">
      <div className="min-w-0">
        <p className="text-[13px] text-text-muted">
          {label} · {summary.count === 1 ? "1 venta" : `${summary.count} ventas`}
        </p>
        <strong className="block text-xl font-extrabold tabular-nums text-text-strong">{formatCurrency(summary.total)}</strong>
      </div>
      {summary.byMethod.length > 0 ? (
        <ul className="shrink-0 text-right text-[13px] text-text-muted">
          {summary.byMethod.slice(0, 2).map((item) => (
            <li key={item.method} className="tabular-nums">
              {paymentLabel(item.method)} {shortAmount(item.total)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PhoneList({ groups }: { groups: ReturnType<typeof groupSalesByDay> }) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {groups.map((group) => (
        <section key={group.date} aria-label={dayHeading(group.date)} className="flex flex-col gap-2">
          <h2 className="flex justify-between px-1 text-xs font-bold text-text-muted">
            <span className="uppercase tracking-wide">{dayHeading(group.date)}</span>
            <span className="tabular-nums">{formatCurrency(group.total)}</span>
          </h2>
          <ul className="divide-y divide-app-border overflow-hidden rounded-card border border-app-border bg-app-surface">
            {group.sales.map((sale) => (
              <li key={sale.id}>
                <Link href={`/dashboard/sales/${sale.id}`} className="flex items-center justify-between gap-3 px-3.5 py-3 hover:bg-app-surface-muted">
                  <span className="min-w-0">
                    <strong className={`block truncate text-sm text-text-strong ${sale.status === "voided" ? "line-through decoration-text-muted" : ""}`}>
                      {itemsSummary(sale)}
                    </strong>
                    <span className="text-xs text-text-muted">
                      {formatTimeShort(sale.created_at)} · {paymentLabel(sale.payment_method)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <strong className={`tabular-nums text-text-strong ${sale.status === "voided" ? "line-through decoration-text-muted" : ""}`}>
                      {formatCurrency(sale.total)}
                    </strong>
                    <SaleStatusBadge status={sale.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SalesTable({
  groups,
  multiDay,
  selectedId,
  onSelect,
}: {
  groups: ReturnType<typeof groupSalesByDay>;
  multiDay: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-app-border bg-app-surface max-md:hidden">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-app-surface-muted text-left text-xs font-semibold text-text-muted">
          <tr>
            <th scope="col" className="w-[68px] px-3 py-2.5">Hora</th>
            <th scope="col" className="px-3 py-2.5">Productos</th>
            <th scope="col" className="w-[112px] px-3 py-2.5">Pago</th>
            <th scope="col" className="w-[116px] px-3 py-2.5">Estado</th>
            <th scope="col" className="w-[108px] px-3 py-2.5 text-right">Total</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.date} className="divide-y divide-app-border border-t border-app-border">
            {multiDay ? (
              <tr className="bg-app-surface-muted/60">
                <th scope="colgroup" colSpan={4} className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-text-muted">
                  {dayHeading(group.date)}
                </th>
                <td className="px-3 py-1.5 text-right text-xs font-bold tabular-nums text-text-muted">{formatCurrency(group.total)}</td>
              </tr>
            ) : null}
            {group.sales.map((sale) => {
              const isSelected = sale.id === selectedId;
              const voided = sale.status === "voided";
              return (
                <tr
                  key={sale.id}
                  onClick={() => onSelect(sale.id)}
                  className={`cursor-pointer ${isSelected ? "bg-brand-50" : "hover:bg-app-surface-muted"}`}
                >
                  <td className="px-3 py-2.5 tabular-nums text-text-muted">{formatTimeShort(sale.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      aria-label={`Ver venta de ${formatCurrency(sale.total)}: ${itemsSummary(sale)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(sale.id);
                      }}
                      className={`flex w-full min-w-0 items-center gap-1 text-left font-semibold text-text-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        voided ? "line-through decoration-text-muted" : ""
                      }`}
                    >
                      <span className="truncate">{itemsSummary(sale)}</span>
                      <ChevronRight className={`ml-auto h-4 w-4 shrink-0 text-text-muted ${isSelected ? "" : "opacity-0"}`} aria-hidden="true" />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex rounded-full bg-app-surface-muted px-2.5 py-0.5 text-xs font-bold text-text-body">
                      {paymentLabel(sale.payment_method)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <SaleStatusBadge status={sale.status} />
                  </td>
                  <td className={`px-3 py-2.5 text-right font-bold tabular-nums text-text-strong ${voided ? "line-through decoration-text-muted" : ""}`}>
                    {formatCurrency(sale.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function EmptySales({ filters, label }: { filters: SalesFilterValue; label: string }) {
  const today = label === "Hoy";
  const title =
    filters.status === "voided"
      ? "Sin ventas anuladas"
      : filters.status === "completed"
        ? "Sin ventas completadas"
        : today
          ? "Todavía no hay ventas hoy"
          : "Sin ventas en estas fechas";
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-app-border bg-app-surface px-6 py-10 text-center">
      <ReceiptText className="h-8 w-8 text-text-muted" aria-hidden="true" />
      <p className="font-bold text-text-strong">{title}</p>
      <p className="text-sm text-text-muted">
        {today && filters.status === "all" ? "Las ventas que registres en Vender aparecen aquí." : "Prueba con otras fechas."}
      </p>
      {today && filters.status === "all" ? (
        <Button asChild className="mt-1">
          <Link href="/dashboard/pos">Ir a Vender</Link>
        </Button>
      ) : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando ventas" className="overflow-hidden rounded-card border border-app-border bg-app-surface">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 border-t border-app-border px-4 py-3 first:border-t-0">
          <span className="flex flex-col gap-1.5">
            <span className="h-4 w-44 animate-pulse rounded bg-app-surface-muted" />
            <span className="h-3 w-24 animate-pulse rounded bg-app-surface-muted" />
          </span>
          <span className="h-4 w-16 animate-pulse rounded bg-app-surface-muted" />
        </div>
      ))}
    </div>
  );
}
