import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { StoreDayCloseReportView } from "@/features/store-day/components/StoreDayCloseReportView";
import { getCloseReport, listCashMovements } from "@/features/store-day/api";
import type { CashMovement } from "@/features/store-day/types";
import { canViewStoreDayReports } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format/currency";

export default async function StoreDayCloseReportPage({
  params,
}: {
  params: Promise<{ businessDayId: string }>;
}) {
  const session = await requireSession();
  if (!canViewStoreDayReports(session.role)) {
    return <ForbiddenState description="Reporte de cierre requiere permisos de owner." />;
  }

  const { businessDayId } = await params;
  const [report, cashMovements] = await Promise.all([
    getCloseReport(businessDayId),
    listCashMovements({ business_day_id: businessDayId, limit: 100, offset: 0 }),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Reporte de cierre</h1>
          <p className="mt-1 text-sm text-slate-600">
            Snapshot operativo de ventas y caja de la jornada.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/reports/store-days">Ver cierres</Link>
        </Button>
      </div>

      <StoreDayCloseReportView report={report} />
      <CashMovementsSection movements={cashMovements.ok ? cashMovements.data.items : []} />
    </section>
  );
}

function CashMovementsSection({ movements }: { movements: CashMovement[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Libro de caja</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <thead>
            <tr>
              <TableHeaderCell>Fecha</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Monto</TableHeaderCell>
              <TableHeaderCell>Nota</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <TableEmptyRow colSpan={4}>Sin movimientos de caja</TableEmptyRow>
            ) : (
              movements.map((movement) => (
                <tr key={movement.id} className="border-t border-slate-100">
                  <TableCell>{formatDateTime(movement.occurred_at)}</TableCell>
                  <TableCell>{cashMovementLabel(movement.movement_type)}</TableCell>
                  <TableCell className={movement.direction === "in" ? "text-emerald-700" : "text-red-700"}>
                    {movement.direction === "in" ? "+" : "-"}{formatCurrency(movement.amount)}
                  </TableCell>
                  <TableCell>{movement.note ?? "Sin nota"}</TableCell>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </section>
  );
}

function cashMovementLabel(type: string) {
  const labels: Record<string, string> = {
    cash_in: "Entrada",
    cash_out: "Salida",
    expense: "Gasto",
    deposit: "Deposito",
    withdrawal: "Retiro",
  };
  return labels[type] ?? type;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
