"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { saveStoreLocationAction } from "../actions";
import { formDataToStoreLocationValues, validateStoreLocation } from "../schemas";
import { LOCATION_LIMITS, type StoreLocation, type StoreLocationActionState } from "../types";

const initialState: StoreLocationActionState = { ok: false, fieldErrors: {} };

/**
 * Zona, estante y nivel de un lugar (tablero P01B). Sirve para "Nuevo lugar" (en la
 * lista del celular o en una ventana) y para "Editar". `actions` recibe si está guardando.
 */
export function LocationForm({
  location = null,
  idPrefix,
  layout = "stack",
  autoFocus = false,
  onSaved,
  actions,
}: {
  location?: StoreLocation | null;
  /** Ids propios: puede haber dos formularios en la página (celular y ventana). */
  idPrefix: string;
  /** "row": zona ancha y estante / nivel lado a lado (tarjeta del celular). */
  layout?: "stack" | "row";
  autoFocus?: boolean;
  onSaved: (location: StoreLocation) => void;
  actions: (saving: boolean) => ReactNode;
}) {
  const [state, setState] = useState<StoreLocationActionState>(initialState);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Con un error, el foco va al primer campo que lo tiene (teclado y lector de pantalla).
  useEffect(() => {
    if (Object.keys(state.fieldErrors).length === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state.fieldErrors]);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formData = new FormData(event.currentTarget);
    const fieldErrors = validateStoreLocation(formDataToStoreLocationValues(formData));
    if (Object.keys(fieldErrors).length > 0) {
      setState({ ok: false, fieldErrors });
      return;
    }
    setSaving(true);
    try {
      const next = await saveStoreLocationAction(initialState, formData);
      setState(next);
      if (next.ok && next.location) {
        toast.success(next.message ?? "Lugar guardado");
        if (!location) setFormKey((key) => key + 1);
        onSaved(next.location);
      } else if (next.message) {
        toast.error(next.message);
      }
    } catch {
      const message = "No se pudo guardar el lugar. Revisa tu conexión e intenta de nuevo.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <form ref={formRef} key={formKey} onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {location ? <input type="hidden" name="location_id" value={location.id} /> : null}
      {state.message ? (
        <p role="alert" className="rounded-control border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
          {state.message}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={id("zone")}>Zona</Label>
        <Input
          id={id("zone")}
          name="zone"
          data-autofocus={autoFocus || undefined}
          autoComplete="off"
          maxLength={LOCATION_LIMITS.zone}
          placeholder="Pasillo 2, Heladera, Depósito…"
          defaultValue={location?.zone ?? ""}
          error={Boolean(state.fieldErrors.zone)}
          errorId={id("zone-error")}
        />
        <FieldError id={id("zone-error")} message={state.fieldErrors.zone} />
      </div>
      <div className={layout === "row" ? "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2" : "grid gap-3 sm:grid-cols-2"}>
        <div className="space-y-1.5">
          <Label htmlFor={id("shelf")}>
            Estante <span className="font-normal text-text-muted">(opc.)</span>
          </Label>
          <Input
            id={id("shelf")}
            name="shelf"
            autoComplete="off"
            maxLength={LOCATION_LIMITS.shelf}
            placeholder="Estante B"
            defaultValue={location?.shelf ?? ""}
            error={Boolean(state.fieldErrors.shelf)}
            errorId={id("shelf-error")}
          />
          <FieldError id={id("shelf-error")} message={state.fieldErrors.shelf} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("level")}>
            Nivel <span className="font-normal text-text-muted">(opc.)</span>
          </Label>
          <Input
            id={id("level")}
            name="level"
            autoComplete="off"
            maxLength={LOCATION_LIMITS.level}
            placeholder="3"
            defaultValue={location?.level ?? ""}
            error={Boolean(state.fieldErrors.level)}
            errorId={id("level-error")}
          />
          <FieldError id={id("level-error")} message={state.fieldErrors.level} />
        </div>
      </div>
      {actions(saving)}
    </form>
  );
}
