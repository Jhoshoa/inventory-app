"use client";

import { useActionState } from "react";
import { ShieldAlert } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { canConfirmImport } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { confirmImportAction } from "../actions";
import { countImportItems, isImportEditable } from "../schemas";
import type { ImportActionState, InventoryImport } from "../types";

const initialState: ImportActionState = { ok: false, fieldErrors: {} };

export function ImportConfirmPanel({
  inventoryImport,
  role,
}: {
  inventoryImport: InventoryImport;
  role: UserRole;
}) {
  const [state, formAction, isPending] = useActionState(confirmImportAction, initialState);
  const counts = countImportItems(inventoryImport.items);
  const allowed = canConfirmImport(role);
  const disabled = !allowed || !isImportEditable(inventoryImport.status) || counts.approved === 0 || isPending;

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Confirmar Import Image</h2>
        <p className="mt-1 text-sm text-slate-600">
          Se crearan {counts.approved} productos aprobados. Los rechazados se ignoraran.
        </p>
      </div>
      {!allowed ? (
        <Alert>
          <span className="inline-flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Confirmar Import Image requiere rol owner.
          </span>
        </Alert>
      ) : null}
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      <form action={formAction}>
        <input type="hidden" name="import_id" value={inventoryImport.id} />
        <Button type="submit" disabled={disabled}>
          {isPending ? "Confirmando" : "Confirmar Import Image"}
        </Button>
      </form>
    </section>
  );
}
