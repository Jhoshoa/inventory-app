"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LockKeyhole, Store, UnlockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/format/currency";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { closeStoreDayAction, createCashMovementAction, openStoreDayAction, reopenStoreDayAction, voidCashMovementAction } from "../actions";
import type { CashMovement, CashMovementListResult, StoreDay, StoreDayActionState, StoreDayClosingPreviewResult } from "../types";
import { StoreDayClosingPreview } from "./StoreDayClosingPreview";

const initialState: StoreDayActionState = {
  ok: false,
  fieldErrors: {},
};

export function StoreDayStatusPanel({
  storeDay,
  role,
  actions = "none",
  closingPreview,
  cashMovements,
}: {
  storeDay: StoreDay;
  role: UserRole;
  actions?: "none" | "link" | "manage";
  closingPreview?: StoreDayClosingPreviewResult;
  cashMovements?: CashMovementListResult;
}) {
  const isOpen = storeDay.status === "open";
  const canManage = canOpenCloseStore(role);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-md ${
              isOpen ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {isOpen ? <UnlockKeyhole className="h-5 w-5" aria-hidden={true} /> : <LockKeyhole className="h-5 w-5" aria-hidden={true} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">
                {isOpen ? "Tienda abierta" : "Tienda cerrada"}
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {formatBusinessDate(storeDay.business_date)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {isOpen && storeDay.opened_at
                ? `Abierta desde ${formatDateTime(storeDay.opened_at, storeDay.timezone)}`
                : "Abre la jornada para habilitar ventas en POS."}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
              <Store className="h-3.5 w-3.5" aria-hidden={true} />
              Zona operativa: {storeDay.timezone}
            </p>
          </div>
        </div>

        {canManage && actions === "manage" ? (
          <StoreDayActionForm storeDay={storeDay} closingPreview={closingPreview} cashMovements={cashMovements} />
        ) : null}
        {canManage && actions === "link" ? (
          <Button asChild variant="secondary">
            <Link href="/dashboard/settings">Gestionar jornada</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function StoreDayActionForm({
  storeDay,
  closingPreview,
  cashMovements,
}: {
  storeDay: StoreDay;
  closingPreview?: StoreDayClosingPreviewResult;
  cashMovements?: CashMovementListResult;
}) {
  const isOpen = storeDay.status === "open";
  const isReopen = !isOpen && Boolean(storeDay.id && storeDay.closed_at);
  const action = isOpen ? closeStoreDayAction : isReopen ? reopenStoreDayAction : openStoreDayAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [skipCashCount, setSkipCashCount] = useState(false);
  const noteLabel = isOpen ? "Nota de cierre" : isReopen ? "Nota de reapertura" : "Nota de apertura";
  const buttonLabel = isOpen ? "Cerrar tienda" : isReopen ? "Reabrir tienda" : "Abrir tienda";

  return (
    <div className="min-w-full space-y-3 lg:min-w-80">
      {isOpen ? <StoreDayClosingPreview preview={closingPreview} /> : null}
      {isOpen ? <CashMovementPanel cashMovements={cashMovements} /> : null}
      <form action={formAction} className="space-y-2">
        {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
        {!isOpen && !isReopen ? (
          <>
            <Input
              aria-label="Caja inicial"
              inputMode="decimal"
              name="opening_cash_amount"
              placeholder="Caja inicial"
            />
            <FieldError message={state.fieldErrors.opening_cash_amount} />
          </>
        ) : null}
        {isOpen ? (
          <>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
                name="skip_cash_count"
                type="checkbox"
                checked={skipCashCount}
                onChange={(event) => setSkipCashCount(event.target.checked)}
              />
              Cerrar sin conteo de efectivo
            </label>
            <Input
              aria-label="Efectivo contado"
              disabled={skipCashCount}
              inputMode="decimal"
              name="counted_cash_amount"
              placeholder={skipCashCount ? "Sin conteo" : "Efectivo contado"}
              required={!skipCashCount}
            />
            <FieldError message={state.fieldErrors.counted_cash_amount} />
          </>
        ) : null}
        <Input
          aria-label={noteLabel}
          name="note"
          placeholder={`${noteLabel} opcional`}
        />
        <FieldError message={state.fieldErrors.note} />
        {!isOpen && isReopen && storeDay.closing_snapshot_at ? (
          <Button asChild className="w-full" variant="secondary">
            <Link href={`/dashboard/reports/store-days/${storeDay.id}`}>Ver reporte de cierre</Link>
          </Button>
        ) : null}
        <Button className="w-full" type="submit" variant={isOpen ? "danger" : "primary"} disabled={isPending}>
          {isPending ? "Procesando..." : buttonLabel}
        </Button>
      </form>
    </div>
  );
}

function CashMovementPanel({ cashMovements }: { cashMovements?: CashMovementListResult }) {
  const [state, formAction, isPending] = useActionState(createCashMovementAction, initialState);
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-950">Movimientos de caja</p>
      <form action={formAction} className="grid gap-2">
        {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
        <Select aria-label="Tipo de movimiento" name="movement_type" defaultValue="expense">
          <option value="expense">Gasto</option>
          <option value="cash_in">Entrada</option>
          <option value="cash_out">Salida</option>
          <option value="deposit">Deposito</option>
          <option value="withdrawal">Retiro</option>
        </Select>
        <FieldError message={state.fieldErrors.movement_type} />
        <Input aria-label="Monto de movimiento" inputMode="decimal" name="amount" placeholder="Monto" required />
        <FieldError message={state.fieldErrors.amount} />
        <Input aria-label="Nota de movimiento" name="note" placeholder="Nota opcional" />
        <FieldError message={state.fieldErrors.note} />
        <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar movimiento"}</Button>
      </form>
      <CashMovementList cashMovements={cashMovements} />
    </div>
  );
}

function CashMovementList({ cashMovements }: { cashMovements?: CashMovementListResult }) {
  if (!cashMovements) return null;
  if (!cashMovements.ok) return <Alert variant="error">No se pudieron cargar movimientos: {cashMovements.error.message}</Alert>;
  if (cashMovements.data.items.length === 0) {
    return <p className="text-sm text-slate-500">Sin movimientos de caja.</p>;
  }
  return (
    <div className="space-y-2">
      {cashMovements.data.items.slice(0, 5).map((movement) => (
        <CashMovementRow key={movement.id} movement={movement} />
      ))}
    </div>
  );
}

function CashMovementRow({ movement }: { movement: CashMovement }) {
  const [, formAction, isPending] = useActionState(voidCashMovementAction, initialState);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-white p-2 text-sm">
      <div>
        <p className="font-medium text-slate-950">{cashMovementLabel(movement.movement_type)}</p>
        <p className={movement.direction === "in" ? "text-emerald-700" : "text-red-700"}>
          {movement.direction === "in" ? "+" : "-"}{formatCurrency(movement.amount)}
        </p>
        {movement.note ? <p className="text-xs text-slate-500">{movement.note}</p> : null}
      </div>
      <form action={formAction}>
        <input type="hidden" name="movement_id" value={movement.id} />
        <Button type="submit" variant="secondary" disabled={isPending}>Anular</Button>
      </form>
    </div>
  );
}

function cashMovementLabel(type: string) {
  const labels: Record<string, string> = {
    cash_in: "Entrada",
    cash_out: "Salida",
    expense: "Gasto",
    deposit: "Deposito",
    withdrawal: "Retiro",
  };
  return labels[type] ?? type;
}

function formatBusinessDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const day = part("day");
  const month = part("month");
  const year = part("year");
  const hour = part("hour");
  const minute = part("minute");
  if (!day || !month || !year || !hour || !minute) return value;
  return `${day}/${month}/${year}, ${hour}:${minute}`;
}
