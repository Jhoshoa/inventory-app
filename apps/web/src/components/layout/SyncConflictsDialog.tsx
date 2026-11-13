"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format/currency";
import { formatDateTimeShort } from "@/lib/format/datetime";
import { getOfflineDb, type PendingSale } from "@/lib/offline/db";
import { discardPendingSale, listConflictedSales, retryPendingSale } from "@/lib/offline/syncEngine";

interface SyncConflictsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void | Promise<void>;
}

export function SyncConflictsDialog({ open, onOpenChange, onResolved }: SyncConflictsDialogProps) {
  const [sales, setSales] = useState<PendingSale[] | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listConflictedSales().then((result) => {
      if (!cancelled) setSales(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function refresh() {
    const result = await listConflictedSales();
    setSales(result);
    await onResolved?.();
  }

  async function handleRetry(saleId: string) {
    if (retryingId) return;
    setRetryingId(saleId);
    try {
      await retryPendingSale(saleId);
      const db = getOfflineDb();
      const stillPending = await db.pendingSales.get(saleId);
      if (stillPending && (stillPending.status === "conflict" || stillPending.status === "rejected")) {
        toast.error(stillPending.errorMessage ?? "La venta no se pudo sincronizar. Revisa el detalle.");
      } else {
        toast.success("Venta enviada");
      }
      await refresh();
    } catch {
      toast.error("No se pudo reintentar el envío. Revisa tu conexión.");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDiscard(saleId: string) {
    await discardPendingSale(saleId);
    toast.success("Venta descartada. Su stock volvió.");
    await refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="lg">
      <DialogTitle close>Ventas por revisar</DialogTitle>
      <DialogDescription>
        Se registraron sin conexión, pero no se pudieron guardar. Reintenta si el problema ya se
        resolvió (por ejemplo, se repuso el stock) o descártalas para devolver el stock en este equipo.
      </DialogDescription>
      <DialogBody>
        {sales === null ? (
          <p className="py-8 text-center text-sm text-text-muted">Cargando…</p>
        ) : sales.length === 0 ? (
          <EmptyState
            title="No hay ventas por revisar"
            description="Todas las ventas hechas sin conexión ya se enviaron."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {sales.map((sale) => (
              <li key={sale.id} className="rounded-md border border-app-border bg-app-surface-muted p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="danger">{sale.status === "conflict" ? "Conflicto" : "Rechazada"}</Badge>
                      <span className="text-sm text-text-muted">{formatDateTimeShort(sale.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-text-strong">
                      {sale.items.map((item) => `${item.quantity} × ${item.product_name}`).join(", ")}
                    </p>
                    <p className="text-sm text-text-muted">Total estimado: {formatCurrency(sale.totalEstimate)}</p>
                    {sale.errorMessage ? (
                      <p className="mt-1 text-sm text-status-danger">{sale.errorMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => void handleRetry(sale.id)}
                      disabled={retryingId === sale.id}
                    >
                      {retryingId === sale.id ? "Reintentando…" : "Reintentar"}
                    </Button>
                    <ConfirmDialog
                      title="¿Descartar esta venta?"
                      description="Se borra para siempre y su stock vuelve a este equipo. No se puede deshacer."
                      confirmLabel="Descartar venta"
                      variant="danger"
                      onConfirm={() => handleDiscard(sale.id)}
                      triggerLabel="Descartar"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
