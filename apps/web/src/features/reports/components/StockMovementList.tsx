import Link from "next/link";
import { saleWhen } from "@/features/sales/list";
import type { StockMovement } from "../types";

const TYPE_LABEL: Record<string, string> = {
  sale: "Venta",
  sale_void: "Anulación",
  manual_adjustment: "Ajuste manual",
  import: "Importación",
  stock_movement: "Movimiento",
};

/** "Envase roto" (la razón del ajuste) o el tipo: "Venta", "Anulación". */
export function stockMovementLabel(movement: Pick<StockMovement, "movement_type" | "reason">) {
  if (movement.movement_type === "manual_adjustment" && movement.reason?.trim()) return movement.reason.trim();
  return TYPE_LABEL[movement.movement_type] ?? "Movimiento";
}

/**
 * Movimientos de stock (tablero P08): producto, cuándo y por qué; a la derecha cuánto
 * cambió y con cuánto quedó ("−1 → 10"). El nombre lleva al producto.
 */
export function StockMovementList({ movements, today }: { movements: StockMovement[]; today: string }) {
  return (
    <ul className="divide-y divide-app-border overflow-hidden rounded-card border border-app-border bg-app-surface">
      {movements.map((movement) => {
        const positive = movement.quantity_delta > 0;
        return (
          <li key={movement.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0">
              {movement.product_name ? (
                <Link href={`/dashboard/products/${movement.product_id}`} className="block truncate text-sm font-bold text-text-strong hover:underline">
                  {movement.product_name}
                </Link>
              ) : (
                <span className="block truncate text-sm font-bold text-text-muted">Producto borrado</span>
              )}
              <p className="truncate text-xs text-text-muted">
                {saleWhen(movement.created_at, today)} · {stockMovementLabel(movement)}
              </p>
            </div>
            <p className="shrink-0 text-right text-sm tabular-nums">
              <strong className={positive ? "text-status-success" : "text-text-strong"}>
                {positive ? "+" : "−"}
                {Math.abs(movement.quantity_delta)}
              </strong>
              <span className="text-text-muted"> → {movement.stock_after}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
