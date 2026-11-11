"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import { deleteStoreLocationAction, saveStoreLocationAction } from "../actions";
import { LOCATION_LIMITS, type StoreLocation, type StoreLocationActionState } from "../types";

const initialState: StoreLocationActionState = { ok: false, fieldErrors: {} };

/** Lugares de la tienda (Zona -> Mueble -> Nivel) para ubicar productos. */
export function StoreLocationSettings({ locations }: { locations: StoreLocation[] }) {
  const [state, setState] = useState<StoreLocationActionState>(initialState);
  const [editing, setEditing] = useState<StoreLocation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const zoneRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function startEditing(location: StoreLocation | null) {
    setEditing(location);
    setState(initialState);
    // Los campos no son controlados: se recrean con la key del formulario.
    window.setTimeout(() => zoneRef.current?.focus(), 0);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setState(initialState);
    try {
      const next = await saveStoreLocationAction(initialState, new FormData(event.currentTarget));
      setState(next);
      if (next.ok) {
        toast.success(next.message || "Ubicacion guardada");
        formRef.current?.reset();
        setEditing(null);
        router.refresh();
      } else if (next.message) {
        toast.error(next.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la ubicacion.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(location: StoreLocation) {
    const result = await deleteStoreLocationAction(location.id);
    if (result.ok) {
      toast.success(result.message);
      if (editing?.id === location.id) setEditing(null);
      router.refresh();
    } else {
      toast.error(result.message || "No se pudo eliminar la ubicacion");
    }
  }

  return (
    <CollapsibleSection
      id="ubicaciones"
      title="Ubicaciones"
      description="Zona, mueble y nivel donde estan los productos. Los cajeros las ven en el POS."
    >
      <form
        key={editing?.id ?? "new"}
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto] md:items-start"
      >
        {editing ? <input type="hidden" name="location_id" value={editing.id} /> : null}
        <div className="space-y-2">
          <Label htmlFor="location-zone">Zona</Label>
          <Input
            ref={zoneRef}
            id="location-zone"
            name="zone"
            placeholder="Pasillo 2, Deposito…"
            maxLength={LOCATION_LIMITS.zone}
            defaultValue={editing?.zone}
            error={Boolean(state.fieldErrors.zone)}
          />
          <FieldError message={state.fieldErrors.zone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-shelf">Mueble o estante (opcional)</Label>
          <Input
            id="location-shelf"
            name="shelf"
            placeholder="Estante B, Heladera…"
            maxLength={LOCATION_LIMITS.shelf}
            defaultValue={editing?.shelf ?? ""}
            error={Boolean(state.fieldErrors.shelf)}
          />
          <FieldError message={state.fieldErrors.shelf} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-level">Nivel (opcional)</Label>
          <Input
            id="location-level"
            name="level"
            placeholder="3"
            maxLength={LOCATION_LIMITS.level}
            defaultValue={editing?.level ?? ""}
            error={Boolean(state.fieldErrors.level)}
          />
          <FieldError message={state.fieldErrors.level} />
        </div>
        <div className="flex gap-2 md:mt-7">
          <Button type="submit" className="w-full md:w-auto" disabled={isSaving}>
            {isSaving ? "Guardando..." : editing ? "Guardar" : "Agregar"}
          </Button>
          {editing ? (
            <Button type="button" variant="secondary" onClick={() => startEditing(null)}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Ubicacion</TableHeaderCell>
            <TableHeaderCell align="right">Productos</TableHeaderCell>
            <TableHeaderCell align="right">Accion</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {locations.length === 0 ? (
            <TableEmptyRow colSpan={3}>
              <EmptyState
                title="Sin ubicaciones"
                description="Agrega los lugares de tu tienda y despues asignalos desde cada producto."
                className="border-0 bg-transparent py-6 shadow-none"
              />
            </TableEmptyRow>
          ) : (
            locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell>
                  <TableText className="font-medium text-text-strong">{location.label}</TableText>
                </TableCell>
                <TableCell align="right">{location.product_count}</TableCell>
                <TableCell align="right">
                  <TableActionGroup>
                    <Button variant="ghost" onClick={() => startEditing(location)}>
                      Editar
                    </Button>
                    <ConfirmDialog
                      triggerLabel="Eliminar"
                      title="Eliminar ubicacion"
                      description={
                        location.product_count > 0
                          ? `"${location.label}" se quitara de ${location.product_count} producto(s). Los productos no se borran.`
                          : `Se eliminara "${location.label}".`
                      }
                      confirmLabel="Eliminar"
                      onConfirm={() => onDelete(location)}
                    />
                  </TableActionGroup>
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </CollapsibleSection>
  );
}
