"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LockKeyhole, Store, UnlockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { closeStoreDayAction, openStoreDayAction, reopenStoreDayAction } from "../actions";
import type { StoreDay, StoreDayActionState } from "../types";

const initialState: StoreDayActionState = {
  ok: false,
  fieldErrors: {},
};

export function StoreDayStatusPanel({
  storeDay,
  role,
  actions = "none",
}: {
  storeDay: StoreDay;
  role: UserRole;
  actions?: "none" | "link" | "manage";
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

        {canManage && actions === "manage" ? <StoreDayActionForm storeDay={storeDay} /> : null}
        {canManage && actions === "link" ? (
          <Button asChild variant="secondary">
            <Link href="/dashboard/settings">Gestionar jornada</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function StoreDayActionForm({ storeDay }: { storeDay: StoreDay }) {
  const isOpen = storeDay.status === "open";
  const isReopen = !isOpen && Boolean(storeDay.id && storeDay.closed_at);
  const action = isOpen ? closeStoreDayAction : isReopen ? reopenStoreDayAction : openStoreDayAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const noteLabel = isOpen ? "Nota de cierre" : isReopen ? "Nota de reapertura" : "Nota de apertura";
  const buttonLabel = isOpen ? "Cerrar tienda" : isReopen ? "Reabrir tienda" : "Abrir tienda";

  return (
    <form action={formAction} className="min-w-full space-y-2 lg:min-w-80">
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      <Input
        aria-label={noteLabel}
        name="note"
        placeholder={`${noteLabel} opcional`}
      />
      <FieldError message={state.fieldErrors.note} />
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
