import { formatCurrency } from "@/lib/format/currency";
import { movementTypeLabel } from "@/features/store-day/cash/cashRegister";
import type { CashMovement } from "@/features/store-day/types";
import { saleWhen } from "@/features/sales/list";

/**
 * Movimientos de caja para leer (tablero P08): tipo, nota, quién y cuándo, monto con
 * signo. Los anulados van tachados con su razón; anular se hace en Caja.
 */
export function CashMovementList({
  movements,
  names,
  today,
  showDay = true,
}: {
  movements: CashMovement[];
  names: Record<string, string>;
  today: string;
  /** En la página de un cierre todos son del mismo día: solo la hora. */
  showDay?: boolean;
}) {
  return (
    <ul className="divide-y divide-app-border overflow-hidden rounded-card border border-app-border bg-app-surface">
      {movements.map((movement) => {
        const voided = Boolean(movement.voided_at);
        const income = movement.direction === "in";
        const when = saleWhen(movement.occurred_at, today);
        const who = names[movement.created_by_user_id];
        return (
          <li key={movement.id} className="flex items-start justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0">
              <p className={`text-sm font-bold text-text-strong ${voided ? "line-through decoration-text-muted" : ""}`}>
                {movementTypeLabel(movement.movement_type)}
                {movement.note ? <span className="font-normal text-text-body"> · {movement.note}</span> : null}
              </p>
              <p className="text-xs text-text-muted">
                {showDay ? when : when.split(" ").pop()}
                {who ? ` · ${who}` : ""}
              </p>
              {voided ? (
                <p className="mt-0.5 text-xs font-semibold text-status-danger">Anulado · {movement.void_reason?.trim() || "sin razón"}</p>
              ) : null}
            </div>
            <strong
              className={`shrink-0 tabular-nums ${voided ? "text-text-muted line-through" : income ? "text-status-success" : "text-text-strong"}`}
            >
              {income ? "+" : "−"} {formatCurrency(movement.amount)}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}
