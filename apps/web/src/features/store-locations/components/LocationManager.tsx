"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductsSubpageHeader } from "@/features/products/components/ProductsSubpageHeader";
import { deleteStoreLocationAction } from "../actions";
import type { StoreLocation } from "../types";
import { LocationForm } from "./LocationForm";

/**
 * Productos › Lugares en la tienda (tablero P01B): pasillo, estante, heladera…
 * Se marcan en cada producto con "Dónde está" y los cajeros los ven al vender.
 */
export function LocationManager({
  locations,
  loadError = null,
}: {
  locations: StoreLocation[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ location: StoreLocation | null } | null>(null);
  const [deleting, setDeleting] = useState<StoreLocation | null>(null);
  const refresh = () => router.refresh();

  const newButton = (
    <Button onClick={() => setDialog({ location: null })}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Nuevo lugar
    </Button>
  );

  async function remove(location: StoreLocation) {
    const result = await deleteStoreLocationAction(location.id);
    if (!result.ok) {
      toast.error(result.message || "No se pudo eliminar el lugar");
      throw new Error(result.message);
    }
    toast.success(`"${location.label}" eliminado`);
    setDeleting(null);
    refresh();
  }

  return (
    <div className="flex flex-col gap-3.5 pb-4">
      <ProductsSubpageHeader
        title="Lugares en la tienda"
        summary={loadError ? null : locations.length === 1 ? "1 lugar" : `${locations.length} lugares`}
        action={loadError ? null : newButton}
      />

      {loadError ? (
        <DataFetchError resource="los lugares" error={loadError} onRetry={refresh} />
      ) : (
        <>
          <p className="text-sm text-text-muted">
            Pasillo, estante, heladera, depósito…{" "}
            <span className="md:hidden">Los cajeros los ven al vender como &quot;Dónde está&quot;.</span>
            <span className="max-md:hidden">Se marcan en cada producto con &quot;Dónde está&quot;.</span>
          </p>

          {locations.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Todavía no hay lugares"
              description="Agrega los lugares de tu tienda y después márcalos en cada producto."
              action={<span className="max-md:hidden">{newButton}</span>}
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2 md:hidden" aria-label="Lugares en la tienda">
                {locations.map((location) => (
                  <li
                    key={location.id}
                    className="flex items-center gap-3 rounded-[14px] border border-app-border bg-app-surface px-3.5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[15px] text-text-strong">{location.label}</strong>
                      <span className="text-xs text-text-muted">{productCount(location.product_count)}</span>
                    </div>
                    <Button
                      variant="secondary"
                      className="!h-9 shrink-0 !px-3 text-[13px]"
                      aria-label={`Editar ${location.label}`}
                      onClick={() => setDialog({ location })}
                    >
                      Editar
                    </Button>
                  </li>
                ))}
              </ul>

              <div className="overflow-hidden rounded-card border border-app-border bg-app-surface max-md:hidden">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-app-surface-muted text-left text-xs font-semibold text-text-muted">
                      <th scope="col" className="px-3 py-2.5">Zona</th>
                      <th scope="col" className="px-3 py-2.5">Estante</th>
                      <th scope="col" className="px-3 py-2.5">Nivel</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Productos</th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((location) => (
                      <tr key={location.id} className="border-t border-app-border">
                        <td className="px-3 py-2.5 font-bold text-text-strong">{location.zone}</td>
                        <td className="px-3 py-2.5 text-text-muted">{location.shelf ?? "—"}</td>
                        <td className="px-3 py-2.5 text-text-muted">{location.level ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-body">{location.product_count}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          <div className="inline-flex gap-1.5">
                            <Button
                              variant="secondary"
                              className="!h-[34px] rounded-[10px] !px-2.5 text-[13px]"
                              aria-label={`Editar ${location.label}`}
                              onClick={() => setDialog({ location })}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              className="!h-[34px] rounded-[10px] !px-2.5 text-[13px] text-status-danger"
                              aria-label={`Eliminar ${location.label}`}
                              onClick={() => setDeleting(location)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Celular: "Nuevo lugar" queda debajo de la lista, sin abrir otra pantalla. */}
          <section aria-labelledby="new-location-title" className="rounded-card border border-app-border bg-app-surface p-4 md:hidden">
            <h2 id="new-location-title" className="mb-3 text-[15px] font-bold text-text-strong">
              Nuevo lugar
            </h2>
            <LocationForm
              idPrefix="inline-location"
              layout="row"
              onSaved={refresh}
              actions={(saving) => (
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Agregando…" : "Agregar"}
                </Button>
              )}
            />
          </section>
        </>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)} position="sheet" size="md">
        {dialog ? (
          <>
            <DialogTitle close>{dialog.location ? "Editar lugar" : "Nuevo lugar"}</DialogTitle>
            <DialogBody className="!pb-5">
              <LocationForm
                key={dialog.location?.id ?? "new"}
                idPrefix="dialog-location"
                location={dialog.location}
                autoFocus
                onSaved={() => {
                  setDialog(null);
                  refresh();
                }}
                actions={(saving) => (
                  <div className={`mt-1 flex items-center gap-2 ${dialog.location ? "justify-between" : "justify-end"}`}>
                    {dialog.location ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-status-danger"
                        disabled={saving}
                        onClick={() => {
                          const location = dialog.location;
                          setDialog(null);
                          setDeleting(location);
                        }}
                      >
                        Eliminar…
                      </Button>
                    ) : null}
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" disabled={saving} onClick={() => setDialog(null)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Guardando…" : dialog.location ? "Guardar" : "Agregar"}
                      </Button>
                    </div>
                  </div>
                )}
              />
            </DialogBody>
          </>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `¿Eliminar "${deleting.label}"?` : "Eliminar lugar"}
        description={deleting ? deleteDescription(deleting) : undefined}
        confirmLabel="Eliminar lugar"
        pendingLabel="Eliminando…"
        onConfirm={() => (deleting ? remove(deleting) : undefined)}
      />
    </div>
  );
}

function productCount(count: number) {
  if (count === 0) return "Sin productos";
  return count === 1 ? "1 producto" : `${count} productos`;
}

function deleteDescription(location: StoreLocation) {
  if (location.product_count === 0) return "Ningún producto lo usa.";
  return `Se quita de ${productCount(location.product_count)}. Los productos y su stock no cambian; solo dejan de mostrar este lugar.`;
}
