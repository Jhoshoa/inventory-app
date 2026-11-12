"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import {
  LOCATION_KIND_LABEL,
  MAX_LOCATIONS_PER_PRODUCT,
  type ProductLocationKind,
  type StoreLocation,
} from "../types";
import { LocationForm } from "./LocationForm";

export interface PickedLocation {
  location_id: string;
  kind: ProductLocationKind;
}

/**
 * "Dónde está" al crear un producto (tablero P02): elegir hasta 6 lugares, o crear
 * uno sin salir del formulario ("+ Nuevo lugar" lo deja marcado). El primero va como
 * Exhibición y los demás como Depósito; tocar el lugar cambia el tipo.
 */
export function LocationPicker({
  locations,
  value,
  onChange,
  onLocationCreated,
}: {
  locations: StoreLocation[];
  value: PickedLocation[];
  onChange: (next: PickedLocation[]) => void;
  onLocationCreated: (location: StoreLocation) => void;
}) {
  const [creating, setCreating] = useState(false);
  const byId = new Map(locations.map((location) => [location.id, location]));
  const available = locations.filter((location) => !value.some((item) => item.location_id === location.id));
  const full = value.length >= MAX_LOCATIONS_PER_PRODUCT;

  function add(locationId: string) {
    if (!locationId || full || value.some((item) => item.location_id === locationId)) return;
    onChange([...value, { location_id: locationId, kind: value.length === 0 ? "display" : "storage" }]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span id="location-picker-label" className="text-sm font-medium text-text-body">
          Dónde está <span className="font-normal text-text-muted">(opcional)</span>
        </span>
        <button
          type="button"
          className="text-sm font-bold text-brand-700 hover:underline disabled:text-text-disabled"
          onClick={() => setCreating(true)}
          disabled={full}
        >
          + Nuevo lugar
        </button>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-labelledby="location-picker-label">
          {value.map((item) => {
            const location = byId.get(item.location_id);
            if (!location) return null;
            const nextKind: ProductLocationKind = item.kind === "display" ? "storage" : "display";
            return (
              <li key={item.location_id} className="inline-flex items-center rounded-full border border-brand-700 bg-brand-50 text-sm text-brand-800">
                <button
                  type="button"
                  className="py-1.5 pl-3 pr-1 font-semibold"
                  aria-label={`${location.label}, ${LOCATION_KIND_LABEL[item.kind]}. Cambiar a ${LOCATION_KIND_LABEL[nextKind]}`}
                  onClick={() =>
                    onChange(value.map((entry) => (entry.location_id === item.location_id ? { ...entry, kind: nextKind } : entry)))
                  }
                >
                  {location.label} · {LOCATION_KIND_LABEL[item.kind]}
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-100"
                  aria-label={`Quitar ${location.label}`}
                  onClick={() => onChange(value.filter((entry) => entry.location_id !== item.location_id))}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {locations.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no hay lugares. Crea el primero con &quot;+ Nuevo lugar&quot;.</p>
      ) : full ? (
        <p className="text-xs text-text-muted">Llegaste al máximo de {MAX_LOCATIONS_PER_PRODUCT} lugares.</p>
      ) : available.length > 0 ? (
        <Select aria-labelledby="location-picker-label" value="" onChange={(event) => add(event.target.value)}>
          <option value="">{value.length === 0 ? "Elige uno o más lugares" : "Agregar otro lugar"}</option>
          {available.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </Select>
      ) : null}

      <Dialog open={creating} onOpenChange={setCreating} position="sheet" size="md">
        {creating ? (
          <>
            <DialogTitle close>Nuevo lugar en la tienda</DialogTitle>
            <DialogBody className="!pb-5">
              <p className="mb-3 text-sm text-text-muted">Pasillo, estante, heladera, depósito…</p>
              <LocationForm
                idPrefix="picker-location"
                autoFocus
                showPreview
                onSaved={(location) => {
                  onLocationCreated(location);
                  if (!full) onChange([...value, { location_id: location.id, kind: value.length === 0 ? "display" : "storage" }]);
                  setCreating(false);
                }}
                actions={(saving) => (
                  <div className="mt-1 flex justify-end gap-2">
                    <Button type="button" variant="secondary" disabled={saving} onClick={() => setCreating(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {saving ? "Creando…" : "Crear y marcar"}
                    </Button>
                  </div>
                )}
              />
            </DialogBody>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
