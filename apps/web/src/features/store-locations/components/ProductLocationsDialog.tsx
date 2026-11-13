"use client";

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
import { LocationForm } from "./LocationForm";

/** Con más lugares que esto, la lista trae un buscador (tablero P04). */
const FILTER_FROM = 8;

/**
 * "Dónde está" de un producto (tablero P04): hasta 6 lugares, el primero marcado
 * queda como Exhibición. "+ Nuevo lugar" abre encima Zona / Estante / Nivel y vuelve
 * con el lugar ya marcado. Guarda con PUT /products/{id}/locations.
 */
export function ProductLocationsDialog({
  productId,
  current,
  storeLocations,
  open: controlledOpen,
  onOpenChange,
  trigger = true,
}: {
  productId: string;
  current: ProductLocation[];
  storeLocations: StoreLocation[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** false: la abre otro control con `open`. */
  trigger?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      {trigger ? (
        <Button variant="secondary" className="!h-9 !px-3 text-[13px]" onClick={() => setOpen(true)}>
          {current.length > 0 ? "Cambiar" : "Elegir lugares"}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen} position="sheet" size="lg">
        {open ? (
          <PlacesForm productId={productId} current={current} storeLocations={storeLocations} onDone={() => setOpen(false)} />
        ) : null}
      </Dialog>
    </>
  );
}

function PlacesForm({
  productId,
  current,
  storeLocations,
  onDone,
}: {
  productId: string;
  current: ProductLocation[];
  storeLocations: StoreLocation[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [locations, setLocations] = useState(storeLocations);
  const [selected, setSelected] = useState<Map<string, ProductLocationKind>>(
    () => new Map(current.map((location) => [location.id, location.kind])),
  );
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const full = selected.size >= MAX_LOCATIONS_PER_PRODUCT;

  const term = filter.trim().toLowerCase();
  // Los marcados primero, para ver de un vistazo dónde está.
  const shown = useMemo(() => {
    const matching = term ? locations.filter((location) => location.label.toLowerCase().includes(term)) : locations;
    return [...matching].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)));
    // El orden se fija al abrir y al filtrar, no en cada clic (si no, la fila salta).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, term]);

  function toggle(locationId: string) {
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(locationId)) next.delete(locationId);
      else if (next.size < MAX_LOCATIONS_PER_PRODUCT) next.set(locationId, next.size === 0 ? "display" : "storage");
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const result = await setProductLocationsAction(
        productId,
        [...selected].map(([location_id, kind]) => ({ location_id, kind })),
      );
      if (result.ok) {
        toast.success('"Dónde está" guardado', { id: "places-saved" });
        onDone();
        router.refresh();
      } else {
        toast.error(result.message || 'No se pudo guardar "Dónde está"');
      }
    } catch {
      toast.error("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogTitle close={!saving}>Dónde está</DialogTitle>
      <DialogBody className="space-y-3">
        {locations.length === 0 ? (
          <div className="rounded-control border border-dashed border-app-borderStrong p-4 text-center">
            <p className="font-semibold text-text-strong">Todavía no hay lugares</p>
            <p className="mt-1 text-sm text-text-muted">Pasillo, estante, heladera, depósito…</p>
          </div>
        ) : (
          <>
            {locations.length > FILTER_FROM ? (
              <Input
                type="search"
                aria-label="Buscar lugar"
                placeholder="Buscar lugar…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            ) : null}
            <ul className="max-h-[50vh] divide-y divide-app-border overflow-y-auto rounded-control border border-app-border">
              {shown.map((location) => {
                const kind = selected.get(location.id);
                const checked = kind !== undefined;
                const checkboxId = `place-${location.id}`;
                return (
                  <li key={location.id} className="flex min-h-12 flex-wrap items-center gap-3 px-3 py-2">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      className="h-5 w-5 accent-brand-700"
                      checked={checked}
                      disabled={!checked && full}
                      onChange={() => toggle(location.id)}
                    />
                    <label htmlFor={checkboxId} className="min-w-0 flex-1 text-sm font-semibold text-text-strong">
                      {location.label}
                    </label>
                    {checked ? (
                      <Select
                        aria-label={`Tipo de lugar para ${location.label}`}
                        className="!h-9 !w-36"
                        value={kind}
                        onChange={(event) =>
                          setSelected((previous) => new Map(previous).set(location.id, event.target.value as ProductLocationKind))
                        }
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
                <li className="px-3 py-4 text-center text-sm text-text-muted">Ningún lugar con ese nombre.</li>
              ) : null}
            </ul>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-muted">
            {full ? `Llegaste al máximo de ${MAX_LOCATIONS_PER_PRODUCT} lugares.` : `Hasta ${MAX_LOCATIONS_PER_PRODUCT} lugares.`} Los cajeros los ven al vender.
          </p>
          <button
            type="button"
            className="text-sm font-bold text-brand-700 hover:underline disabled:text-text-disabled"
            onClick={() => setCreating(true)}
            disabled={full}
          >
            + Nuevo lugar
          </button>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone} disabled={saving}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>

      <Dialog open={creating} onOpenChange={setCreating} position="sheet" size="md">
        {creating ? (
          <>
            <DialogTitle close>Nuevo lugar en la tienda</DialogTitle>
            <DialogBody className="!pb-5">
              <LocationForm
                idPrefix="places-new"
                autoFocus
                showPreview
                onSaved={(location) => {
                  setLocations((previous) => [location, ...previous]);
                  toggle(location.id);
                  setCreating(false);
                }}
                actions={(pending) => (
                  <div className="mt-1 flex justify-end gap-2">
                    <Button type="button" variant="secondary" disabled={pending} onClick={() => setCreating(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? "Creando…" : "Crear y marcar"}
                    </Button>
                  </div>
                )}
              />
            </DialogBody>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
