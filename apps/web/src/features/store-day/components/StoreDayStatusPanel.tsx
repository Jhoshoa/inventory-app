"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Store, UnlockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
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
  const [visibleStoreDay, setVisibleStoreDay] = useState(storeDay);
  const didMountRef = useRef(false);
  const isOpen = visibleStoreDay.status === "open";
  const canManage = canOpenCloseStore(role);
  const handleStoreDayUpdated = useCallback((nextStoreDay: StoreDay) => {
    setVisibleStoreDay(nextStoreDay);
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setVisibleStoreDay(storeDay);
  }, [storeDay]);

  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-md border ${
              isOpen
                ? "border-status-successBorder bg-status-successBg text-status-success"
                : "border-status-warningBorder bg-status-warningBg text-status-warning"
            }`}
          >
            {isOpen ? <UnlockKeyhole className="h-5 w-5" aria-hidden={true} /> : <LockKeyhole className="h-5 w-5" aria-hidden={true} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-text-strong">
                {isOpen ? "Tienda abierta" : "Tienda cerrada"}
              </h2>
              <Badge>{formatBusinessDate(visibleStoreDay.business_date)}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {isOpen && visibleStoreDay.opened_at
                ? `Abierta desde ${formatDateTime(visibleStoreDay.opened_at, visibleStoreDay.timezone)}`
                : "Abre la jornada para habilitar ventas en POS."}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted">
              <Store className="h-3.5 w-3.5" aria-hidden={true} />
              Zona operativa: {visibleStoreDay.timezone}
            </p>
          </div>
        </div>

        {canManage && actions === "manage" ? (
          <StoreDayActionForm
            key={`${visibleStoreDay.status}-${visibleStoreDay.id ?? "none"}-${visibleStoreDay.opened_at ?? ""}-${visibleStoreDay.closed_at ?? ""}`}
            storeDay={visibleStoreDay}
            closingPreview={closingPreview}
            cashMovements={cashMovements}
            onStoreDayUpdated={handleStoreDayUpdated}
          />
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
  onStoreDayUpdated,
}: {
  storeDay: StoreDay;
  closingPreview?: StoreDayClosingPreviewResult;
  cashMovements?: CashMovementListResult;
  onStoreDayUpdated: (storeDay: StoreDay) => void;
}) {
  const isOpen = storeDay.status === "open";
  const isReopen = !isOpen && Boolean(storeDay.id && storeDay.closed_at);
  const action = isOpen ? closeStoreDayAction : isReopen ? reopenStoreDayAction : openStoreDayAction;
  const [state, setState] = useState<StoreDayActionState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [skipCashCount, setSkipCashCount] = useState(false);
  const noteLabel = isOpen ? "Nota de cierre" : isReopen ? "Nota de reapertura" : "Nota de apertura";
  const buttonLabel = isOpen ? "Cerrar tienda" : isReopen ? "Reabrir tienda" : "Abrir tienda";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nextState = await action(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok && nextState.storeDay) {
        onStoreDayUpdated(nextState.storeDay);
        router.refresh();
      }
    } catch (error) {
      setState({
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo procesar la jornada.",
        fieldErrors: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-w-full space-y-3 lg:min-w-80">
      {isOpen ? <StoreDayClosingPreview preview={closingPreview} /> : null}
      {isOpen ? <CashMovementPanel cashMovements={cashMovements} /> : null}
      <form onSubmit={onSubmit} className="space-y-2">
        {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
        {!isOpen && !isReopen ? (
          <>
            <Input
              aria-label="Caja inicial"
              inputMode="decimal"
              name="opening_cash_amount"
              onInput={sanitizeMoneyInput}
              pattern="\d+(\.\d{1,2})?"
              placeholder="Caja inicial"
              title="Use solo numeros con maximo 2 decimales"
            />
            <FieldError message={state.fieldErrors.opening_cash_amount} />
          </>
        ) : null}
        {isOpen ? (
          <>
            <label className="flex items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-text-body">
              <input
                className="h-4 w-4 rounded border-app-borderStrong text-brand-700 focus:ring-focus"
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
              onInput={sanitizeMoneyInput}
              pattern="\d+(\.\d{1,2})?"
              placeholder={skipCashCount ? "Sin conteo" : "Efectivo contado"}
              required={!skipCashCount}
              title="Use solo numeros con maximo 2 decimales"
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
        <Button className="w-full" type="submit" variant={isOpen ? "danger" : "primary"} disabled={isSubmitting}>
          {isSubmitting ? "Procesando..." : buttonLabel}
        </Button>
      </form>
    </div>
  );
}

function CashMovementPanel({ cashMovements }: { cashMovements?: CashMovementListResult }) {
  const [state, setState] = useState<StoreDayActionState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialState);
    try {
      const nextState = await createCashMovementAction(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        event.currentTarget.reset();
        router.refresh();
      }
    } catch (error) {
      setState({
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo registrar el movimiento.",
        fieldErrors: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-app-border bg-app-surface-muted p-3">
      <p className="text-sm font-semibold text-text-strong">Movimientos de caja</p>
      <form onSubmit={onSubmit} className="grid gap-2">
        {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
        <Select aria-label="Tipo de movimiento" name="movement_type" defaultValue="expense">
          <option value="expense">Gasto</option>
          <option value="cash_in">Entrada</option>
          <option value="cash_out">Salida</option>
          <option value="deposit">Deposito</option>
          <option value="withdrawal">Retiro</option>
        </Select>
        <FieldError message={state.fieldErrors.movement_type} />
        <Input
          aria-label="Monto de movimiento"
          inputMode="decimal"
          name="amount"
          onInput={sanitizeMoneyInput}
          pattern="\d+(\.\d{1,2})?"
          placeholder="Monto"
          required
          title="Use solo numeros con maximo 2 decimales"
        />
        <FieldError message={state.fieldErrors.amount} />
        <Input aria-label="Nota de movimiento" name="note" placeholder="Nota opcional" />
        <FieldError message={state.fieldErrors.note} />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registrando..." : "Registrar movimiento"}</Button>
      </form>
      <CashMovementList cashMovements={cashMovements} />
    </div>
  );
}

function CashMovementList({ cashMovements }: { cashMovements?: CashMovementListResult }) {
  if (!cashMovements) return null;
  if (!cashMovements.ok) return <Alert variant="error">No se pudieron cargar movimientos: {cashMovements.error.message}</Alert>;
  if (cashMovements.data.items.length === 0) {
    return <p className="text-sm text-text-muted">Sin movimientos de caja.</p>;
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
  const [state, setState] = useState<StoreDayActionState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nextState = await voidCashMovementAction(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) router.refresh();
    } catch (error) {
      setState({
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo anular el movimiento.",
        fieldErrors: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-app-surface p-2 text-sm">
      <div>
        <p className="font-medium text-text-strong">{cashMovementLabel(movement.movement_type)}</p>
        <p className={movement.direction === "in" ? "text-status-success" : "text-status-danger"}>
          {movement.direction === "in" ? "+" : "-"}{formatCurrency(movement.amount)}
        </p>
        {movement.note ? <p className="text-xs text-text-muted">{movement.note}</p> : null}
      </div>
      {state.message && !state.ok ? <Alert variant="error">{state.message}</Alert> : null}
      <form onSubmit={onSubmit}>
        <input type="hidden" name="movement_id" value={movement.id} />
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? "Anulando..." : "Anular"}
        </Button>
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

function sanitizeMoneyInput(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const sanitized = toMoneyInputValue(input.value);
  if (input.value !== sanitized) input.value = sanitized;
}

export function toMoneyInputValue(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integer = "", ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return integer;
  return `${integer}.${decimalParts.join("").slice(0, 2)}`;
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
