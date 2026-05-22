"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LockKeyhole, Store, UnlockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { closeStoreDayAction, openStoreDayAction, reopenStoreDayAction } from "../actions";
import type { StoreDay, StoreDayActionState, StoreDayClosingPreviewResult } from "../types";
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
}: {
  storeDay: StoreDay;
  role: UserRole;
  actions?: "none" | "link" | "manage";
  closingPreview?: StoreDayClosingPreviewResult;
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
                ? `Abierta desde ${formatDateTime(storeDay.opened_at)}`
                : "Abre la jornada para habilitar ventas en POS."}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
              <Store className="h-3.5 w-3.5" aria-hidden={true} />
              Zona operativa: {storeDay.timezone}
            </p>
          </div>
        </div>

        {canManage && actions === "manage" ? (
          <StoreDayActionForm storeDay={storeDay} closingPreview={closingPreview} />
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
}: {
  storeDay: StoreDay;
  closingPreview?: StoreDayClosingPreviewResult;
}) {
  const isOpen = storeDay.status === "open";
  const isReopen = !isOpen && Boolean(storeDay.id && storeDay.closed_at);
  const action = isOpen ? closeStoreDayAction : isReopen ? reopenStoreDayAction : openStoreDayAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [skipCashCount, setSkipCashCount] = useState(false);
  const noteLabel = isOpen ? "Nota de cierre" : isReopen ? "Nota de reapertura" : "Nota de apertura";
  const buttonLabel = isOpen ? "Cerrar tienda" : isReopen ? "Reabrir tienda" : "Abrir tienda";

  return (
    <form action={formAction} className="min-w-full space-y-2 lg:min-w-80">
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      {isOpen ? <StoreDayClosingPreview preview={closingPreview} /> : null}
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
  );
}

function formatBusinessDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
