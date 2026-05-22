"use client";

import { useActionState } from "react";
import { LockKeyhole, Store, UnlockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { closeStoreDayAction, openStoreDayAction } from "../actions";
import type { StoreDay, StoreDayActionState } from "../types";

const initialState: StoreDayActionState = {
  ok: false,
  fieldErrors: {},
};

export function StoreDayStatusPanel({
  storeDay,
  role,
}: {
  storeDay: StoreDay;
  role: UserRole;
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

        {canManage ? <StoreDayActionForm isOpen={isOpen} /> : null}
      </div>
    </section>
  );
}

function StoreDayActionForm({ isOpen }: { isOpen: boolean }) {
  const action = isOpen ? closeStoreDayAction : openStoreDayAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="min-w-full space-y-2 lg:min-w-80">
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      <Input
        aria-label={isOpen ? "Nota de cierre" : "Nota de apertura"}
        name="note"
        placeholder={isOpen ? "Nota de cierre opcional" : "Nota de apertura opcional"}
      />
      <FieldError message={state.fieldErrors.note} />
      <Button className="w-full" type="submit" variant={isOpen ? "danger" : "primary"} disabled={isPending}>
        {isPending ? "Procesando..." : isOpen ? "Cerrar tienda" : "Abrir tienda"}
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
