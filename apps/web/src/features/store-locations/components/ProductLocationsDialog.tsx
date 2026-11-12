"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { setProductLocationsAction } from "../actions";
import {
  LOCATION_KIND_LABEL,
  MAX_LOCATIONS_PER_PRODUCT,
  type ProductLocation,
  type ProductLocationKind,
  type StoreLocation,
} from "../types";

/** Con mas ubicaciones que esto, la lista trae un buscador. */
const FILTER_FROM = 8;

export function ProductLocationsDialog({
  productId,
  current,
  storeLocations,
}: {
  productId: string;
  current: ProductLocation[];
  storeLocations: StoreLocation[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Map<string, ProductLocationKind>>(() => toSelection(current));
  const [filter, setFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const term = filter.trim().toLowerCase();
  const shown = useMemo(
    () => (term ? storeLocations.filter((location) => location.label.toLowerCase().includes(term)) : storeLocations),
    [storeLocations, term],
  );
  const full = selected.size >= MAX_LOCATIONS_PER_PRODUCT;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelected(toSelection(current));
      setFilter("");
    }
  }

  function toggle(locationId: string) {
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(locationId)) next.delete(locationId);
      else if (next.size < MAX_LOCATIONS_PER_PRODUCT) next.set(locationId, next.size === 0 ? "display" : "storage");
      return next;
    });
  }

  function setKind(locationId: string, kind: ProductLocationKind) {
    setSelected((previous) => new Map(previous).set(locationId, kind));
  }

  async function onSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await setProductLocationsAction(
        productId,
        [...selected].map(([location_id, kind]) => ({ location_id, kind })),
      );
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "No se pudieron guardar las ubicaciones");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar las ubicaciones");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={() => onOpenChange(true)}>
        {current.length > 0 ? "Cambiar ubicacion" : "Asignar ubicacion"}
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange} size="lg">
        <DialogTitle close>Ubicacion en la tienda</DialogTitle>
        <DialogBody>
          {storeLocations.length === 0 ? (
            <p className="text-sm text-text-muted">
              Todavía no hay lugares. Créalos en{" "}
              <Link href="/dashboard/products/lugares" className="font-medium text-accent-primary underline">
                Productos › Lugares en la tienda
              </Link>{" "}
              (por ejemplo: Pasillo 2 · Estante B · Nivel 3).
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Marca donde esta el producto. Hasta {MAX_LOCATIONS_PER_PRODUCT} lugares; los cajeros lo ven en el POS.
              </p>
              {storeLocations.length > FILTER_FROM ? (
                <Input
                  type="search"
                  aria-label="Buscar ubicacion"
                  placeholder="Buscar ubicacion…"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              ) : null}
              <ul className="max-h-[50vh] divide-y divide-app-border overflow-y-auto rounded-md border border-app-border">
                {shown.map((location) => {
                  const kind = selected.get(location.id);
                  const checked = kind !== undefined;
                  const checkboxId = `location-${location.id}`;
                  return (
                    <li key={location.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        className="h-4 w-4 accent-brand-600"
                        checked={checked}
                        disabled={!checked && full}
                        onChange={() => toggle(location.id)}
                      />
                      <label htmlFor={checkboxId} className="min-w-0 flex-1 text-sm text-text-strong">
                        {location.label}
                      </label>
                      {checked ? (
                        <Select
                          aria-label={`Tipo de ubicacion para ${location.label}`}
                          className="!h-9 !w-36"
                          value={kind}
                          onChange={(event) => setKind(location.id, event.target.value as ProductLocationKind)}
                        >
                          {(Object.keys(LOCATION_KIND_LABEL) as ProductLocationKind[]).map((option) => (
                            <option key={option} value={option}>
                              {LOCATION_KIND_LABEL[option]}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                    </li>
                  );
                })}
                {shown.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-text-muted">Ninguna ubicacion con ese nombre.</li>
                ) : null}
              </ul>
              {full ? (
                <p className="text-xs text-text-muted">Llegaste al maximo de {MAX_LOCATIONS_PER_PRODUCT} ubicaciones.</p>
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          {storeLocations.length > 0 ? (
            <Button type="button" onClick={() => void onSave()} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          ) : null}
        </DialogFooter>
      </Dialog>
    </>
  );
}

function toSelection(current: ProductLocation[]) {
  return new Map(current.map((location) => [location.id, location.kind]));
}
