import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { BATCH_STATUS_LABEL, BATCH_STATUS_VARIANT, daysLeftLabel, formatExpiryDate } from "../batches";
import type { ProductBatch } from "../types";
import { ProductStockDialog } from "./ProductStockDialog";

const ROW_TONE = { ok: "default", expiring: "warning", expired: "danger", depleted: "muted" } as const;

/** Lotes con vencimiento del producto. Dueno y cajero los ven; solo el dueno retira. */
export function ProductBatches({
  productId,
  productName,
  unit,
  stock,
  batches,
  untrackedQuantity,
  canRemove,
}: {
  productId: string;
  productName: string;
  unit: string;
  stock: number;
  batches: ProductBatch[];
  untrackedQuantity: number;
  canRemove: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="product-batches-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="product-batches-title" className="text-base font-semibold text-text-strong">
          Lotes y vencimientos
        </h2>
        {batches.length > 0 && untrackedQuantity > 0 ? (
          <p className="text-sm text-text-muted">
            Sin fecha de vencimiento: {untrackedQuantity} {unit}
          </p>
        ) : null}
      </div>
      {batches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-app-border bg-app-surface p-4 text-sm text-text-muted">
          Este producto no tiene lotes con vencimiento.
          {canRemove ? " Al agregar stock podes indicar la fecha y se crea un lote." : ""}
        </p>
      ) : (
        <Table density="compact">
          <thead>
            <tr>
              <TableHeaderCell>Vence</TableHeaderCell>
              <TableHeaderCell>Estado</TableHeaderCell>
              <TableHeaderCell align="right">Quedan</TableHeaderCell>
              <TableHeaderCell align="right">Ingresaron</TableHeaderCell>
              {canRemove ? <TableHeaderCell align="right">Accion</TableHeaderCell> : null}
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <TableRow key={batch.id} tone={ROW_TONE[batch.status]}>
                <TableCell>
                  <span className="font-medium text-text-strong">{formatExpiryDate(batch.expires_on)}</span>
                  <span className="block text-xs text-text-muted">
                    {daysLeftLabel(batch)} · aviso {batch.alert_days} {batch.alert_days === 1 ? "dia" : "dias"} antes
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={BATCH_STATUS_VARIANT[batch.status]}>{BATCH_STATUS_LABEL[batch.status]}</Badge>
                </TableCell>
                <TableCell align="right" className="font-semibold">
                  {batch.quantity_remaining}
                </TableCell>
                <TableCell align="right">{batch.quantity_initial}</TableCell>
                {canRemove ? (
                  <TableCell align="right">
                    <TableActionGroup>
                      <ProductStockDialog
                        productId={productId}
                        productName={productName}
                        currentStock={stock}
                        triggerLabel={batch.status === "expired" ? "Retirar vencido" : "Retirar"}
                        batches={batches}
                        preset={{
                          quantity: -batch.quantity_remaining,
                          batchId: batch.id,
                          reason: batch.status === "expired" ? "Producto vencido" : undefined,
                        }}
                      />
                    </TableActionGroup>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
