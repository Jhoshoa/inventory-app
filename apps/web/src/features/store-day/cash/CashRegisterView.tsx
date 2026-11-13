"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Minus, Plus, ShoppingCart } from "lucide-react";
import { MoreParentLink } from "@/components/layout/MoreParentLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { formatCurrency } from "@/lib/format/currency";
import { formatBusinessDateShort, formatTimeShort } from "@/lib/format/datetime";
import type { CashMovement, StoreDay, StoreDayCloseReport, StoreDayClosingPreview, StoreDayEvent } from "../types";
import {
  cashDifference,
  eventLabel,
  isClosedToday,
  movementTypeLabel,
  personName,
  timezoneLabel,
  type CashMovementDirection,
} from "./cashRegister";
import { CashMovementDialog } from "./CashMovementDialog";
import { CloseCashDialog } from "./CloseCashDialog";
import { OpenCashDialog } from "./OpenCashDialog";
import { ReopenDayDialog } from "./ReopenDayDialog";
import { VoidMovementDialog } from "./VoidMovementDialog";

export interface CashRegisterData {
  storeDay: StoreDay;
  preview: StoreDayClosingPreview | null;
  /** null: no se pudieron cargar (se muestra el error en su lugar). */
  movements: CashMovement[] | null;
  events: StoreDayEvent[] | null;
  lastClose: StoreDayCloseReport | null;
  /** id → nombre, para "por Rosa". Vacío si no se pudo cargar la lista de personas. */
  names: Record<string, string>;
}

/** Página Caja y jornada (tablero P09 y "A · Caja"). */
export function CashRegisterView({ role, data }: { role: UserRole; data: CashRegisterData }) {
  const router = useRouter();
  const owner = canOpenCloseStore(role);
  const { storeDay } = data;
  const isOpen = storeDay.status === "open";
  const [dialog, setDialog] = useState<null | "open" | "close" | "reopen" | CashMovementDirection>(null);
  const [voiding, setVoiding] = useState<CashMovement | null>(null);
  const refresh = () => router.refresh();
  const openedBy = personName(data.names, storeDay.opened_by_user_id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <MoreParentLink />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Caja y jornada</h1>
            <Badge variant={isOpen ? "success" : "default"}>{isOpen ? "Abierta" : "Cerrada"}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {isOpen && storeDay.opened_at
              ? `Desde ${formatTimeShort(storeDay.opened_at)}${openedBy ? ` por ${openedBy}` : ""} · `
              : `${formatBusinessDateShort(storeDay.business_date)} · `}
            {timezoneLabel(storeDay.timezone)}
          </p>
        </div>
        {owner && isOpen ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDialog("in")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Entrada
            </Button>
            <Button variant="secondary" onClick={() => setDialog("out")}>
              <Minus className="h-4 w-4" aria-hidden="true" />
              Salida o gasto
            </Button>
            <Button onClick={() => setDialog("close")}>Cerrar caja</Button>
          </div>
        ) : null}
      </header>

      {!owner ? (
        <CashierStatus isOpen={isOpen} openedAt={storeDay.opened_at} />
      ) : isOpen ? (
        <>
          <CashSummary preview={data.preview} />
          <MovementsSection
            movements={data.movements}
            names={data.names}
            onVoid={setVoiding}
          />
          <HistorySection events={data.events} names={data.names} openingCash={storeDay.opening_cash_amount} />
        </>
      ) : (
        <>
          <ClosedCard
            closedToday={isClosedToday(storeDay)}
            onOpen={() => setDialog("open")}
            onReopen={() => setDialog("reopen")}
          />
          {data.lastClose ? <LastCloseCard report={data.lastClose} /> : null}
          {isClosedToday(storeDay) ? (
            <HistorySection events={data.events} names={data.names} openingCash={storeDay.opening_cash_amount} />
          ) : null}
        </>
      )}

      {owner ? (
        <>
          <OpenCashDialog
            open={dialog === "open"}
            onOpenChange={(next) => setDialog(next ? "open" : null)}
            businessDate={storeDay.business_date}
            timezone={storeDay.timezone}
            lastOpeningAmount={data.lastClose?.opening_cash_amount ?? null}
            onOpened={refresh}
          />
          {dialog === "in" || dialog === "out" ? (
            <CashMovementDialog
              open
              initialDirection={dialog}
              onOpenChange={(next) => !next && setDialog(null)}
              onSaved={refresh}
            />
          ) : null}
          {dialog === "close" ? (
            <CloseCashDialog
              open
              onOpenChange={(next) => !next && setDialog(null)}
              expectedCash={data.preview?.expected_cash_amount ?? null}
              onClosed={(closed) => {
                // Al cerrar se abre el resumen del cierre (P09).
                if (closed?.id) router.push(`/dashboard/reports/store-days/${closed.id}`);
                else refresh();
              }}
            />
          ) : null}
          <ReopenDayDialog
            open={dialog === "reopen"}
            onOpenChange={(next) => setDialog(next ? "reopen" : null)}
            closedAt={storeDay.closed_at}
            onReopened={refresh}
          />
          <VoidMovementDialog movement={voiding} onOpenChange={(next) => !next && setVoiding(null)} onVoided={refresh} />
        </>
      ) : null}
    </div>
  );
}

function CashierStatus({ isOpen, openedAt }: { isOpen: boolean; openedAt: string | null }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-app-border bg-app-surface p-5">
      <p className="text-base font-bold text-text-strong">
        {isOpen
          ? `La caja está abierta${openedAt ? ` desde las ${formatTimeShort(openedAt)}` : ""}. Ya se puede vender.`
          : "La caja está cerrada. Pídele al dueño que la abra."}
      </p>
      {isOpen ? (
        <Button asChild>
          <Link href="/dashboard/pos">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Ir a Vender
          </Link>
        </Button>
      ) : null}
    </section>
  );
}

function ClosedCard({
  closedToday,
  onOpen,
  onReopen,
}: {
  closedToday: boolean;
  onOpen: () => void;
  onReopen: () => void;
}) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-app-border bg-app-surface p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-control bg-status-warningBg text-status-warning">
        <LockKeyhole className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-text-strong">La caja está cerrada</h2>
        <p className="text-sm text-text-muted">
          {closedToday
            ? "La jornada de hoy ya se cerró. Si hace falta seguir vendiendo, reábrela."
            : "Para vender, abre la caja. Cuenta el dinero con el que empiezas."}
        </p>
      </div>
      {closedToday ? (
        <Button onClick={onReopen}>Reabrir la jornada de hoy</Button>
      ) : (
        <Button onClick={onOpen}>Abrir caja</Button>
      )}
    </section>
  );
}

function LastCloseCard({ report }: { report: StoreDayCloseReport }) {
  const difference =
    report.counted_cash_amount !== null ? cashDifference(report.counted_cash_amount, report.expected_cash_amount) : null;
  return (
    <section className="flex flex-col gap-3 rounded-card border border-app-border bg-app-surface p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
        Último cierre · {formatBusinessDateShort(report.business_date)}
      </h2>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-text-muted">Vendido</dt>
          <dd className="font-bold text-text-strong">{formatCurrency(report.sales_total)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Efectivo contado</dt>
          <dd className="font-bold text-text-strong">
            {report.counted_cash_amount !== null ? formatCurrency(report.counted_cash_amount) : "Sin conteo"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Diferencia</dt>
          <dd
            className={`font-bold ${
              !difference ? "text-text-muted" : difference.kind === "even" ? "text-status-success" : "text-status-warning"
            }`}
          >
            {!difference
              ? "Sin conteo"
              : difference.kind === "even"
                ? "Cuadra"
                : `${difference.kind === "short" ? "−" : "+"} ${formatCurrency(difference.amount)}`}
          </dd>
        </div>
      </dl>
      <Button variant="secondary" asChild className="self-start">
        <Link href={`/dashboard/reports/store-days/${report.business_day_id}`}>Ver cierre</Link>
      </Button>
    </section>
  );
}

function CashSummary({ preview }: { preview: StoreDayClosingPreview | null }) {
  if (!preview) {
    return <DataFetchError resource="el efectivo de la caja" error="No se pudo calcular el efectivo esperado." />;
  }
  const rows = [
    { label: "Apertura", value: preview.opening_cash_amount, sign: "" },
    { label: "Ventas en efectivo", value: preview.cash_sales_total, sign: "+" },
    { label: "Entradas", value: preview.cash_movements_in_total, sign: "+" },
    { label: "Salidas", value: preview.cash_movements_out_total, sign: "−" },
  ];
  return (
    <section aria-label="Efectivo de la caja" className="rounded-card border border-app-border bg-app-surface p-5">
      <dl className="grid gap-3 sm:grid-cols-5 sm:items-end">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2 sm:block">
            <dt className="text-sm text-text-muted">
              {row.sign ? `${row.sign} ` : ""}
              {row.label}
            </dt>
            <dd className="text-base font-bold text-text-strong sm:text-lg">{formatCurrency(row.value)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-2 border-t border-app-border pt-3 sm:block sm:border-0 sm:pt-0">
          <dt className="text-sm font-semibold text-text-strong">= Debería haber</dt>
          <dd className="text-2xl font-extrabold text-text-strong">{formatCurrency(preview.expected_cash_amount)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-text-muted">
        Otros pagos (no son efectivo): QR {formatCurrency(preview.qr_sales_total)} · Transferencia{" "}
        {formatCurrency(preview.transfer_sales_total)} · Tarjeta {formatCurrency(preview.card_sales_total)}
      </p>
    </section>
  );
}

function MovementsSection({
  movements,
  names,
  onVoid,
}: {
  movements: CashMovement[] | null;
  names: Record<string, string>;
  onVoid: (movement: CashMovement) => void;
}) {
  return (
    <section aria-labelledby="movimientos-hoy" className="flex flex-col gap-3">
      <h2 id="movimientos-hoy" className="text-base font-bold text-text-strong">
        Movimientos de hoy
      </h2>
      {movements === null ? (
        <DataFetchError resource="los movimientos de caja" error="Intenta de nuevo en un momento." />
      ) : movements.length === 0 ? (
        <p className="rounded-card border border-dashed border-app-borderStrong bg-app-surface p-5 text-sm text-text-muted">
          Todavía no hay movimientos. Registra una entrada (por ejemplo, sencillo del banco) o una salida (un gasto, un
          retiro).
        </p>
      ) : (
        <ul className="divide-y divide-[#F2F4F7] overflow-hidden rounded-card border border-app-border bg-app-surface">
          {movements.map((movement) => {
            const voided = Boolean(movement.voided_at);
            const who = personName(names, movement.created_by_user_id);
            return (
              <li key={movement.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="w-12 shrink-0 text-sm text-text-muted">{formatTimeShort(movement.occurred_at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-strong">
                    {movementTypeLabel(movement.movement_type)}
                    {voided ? <Badge>Anulado</Badge> : null}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {[movement.note, who, voided && movement.void_reason ? `"${movement.void_reason}"` : null]
                      .filter(Boolean)
                      .join(" · ") || "Sin nota"}
                  </span>
                </span>
                <span
                  className={`text-sm font-bold ${
                    voided ? "text-text-disabled line-through" : movement.direction === "in" ? "text-status-success" : "text-text-strong"
                  }`}
                >
                  {movement.direction === "in" ? "+" : "−"} {formatCurrency(movement.amount)}
                </span>
                {!voided ? (
                  <Button variant="ghost" className="h-9 px-3 text-status-danger" onClick={() => onVoid(movement)}>
                    Anular
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function HistorySection({
  events,
  names,
  openingCash,
}: {
  events: StoreDayEvent[] | null;
  names: Record<string, string>;
  openingCash: string | null;
}) {
  if (events === null) return null;
  return (
    <section aria-labelledby="historial-jornada" className="flex flex-col gap-3">
      <h2 id="historial-jornada" className="text-base font-bold text-text-strong">
        Historial de la jornada
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-text-muted">Aquí aparecen la apertura, los cierres y las reaperturas del día.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {events.map((event) => {
            const who = personName(names, event.created_by_user_id);
            return (
              <li key={event.id} className="rounded-control border border-app-border bg-app-surface px-4 py-3 text-sm">
                <span className="font-semibold text-text-strong">{eventLabel(event)}</span>
                <span className="text-text-muted">
                  {" "}
                  · {formatTimeShort(event.created_at)}
                  {who ? ` · ${who}` : ""}
                </span>
                {event.event_type === "open" && openingCash !== null ? (
                  <span className="block text-xs text-text-muted">Caja inicial {formatCurrency(openingCash)}</span>
                ) : null}
                {event.note ? <span className="block text-xs text-text-muted">{event.note}</span> : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
