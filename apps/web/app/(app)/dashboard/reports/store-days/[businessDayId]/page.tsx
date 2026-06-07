import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
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
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Reportes", href: "/dashboard/reports" },
              { label: "Cierres diarios", href: "/dashboard/reports/store-days" },
              { label: "Reporte de cierre" },
            ]}
          />
        }
        title="Reporte de cierre"
        description="Snapshot operativo de ventas y caja de la jornada."
      />

      <StoreDayCloseReportView report={report} />
      <CashMovementsSection movements={cashMovements.ok ? cashMovements.data.items : []} />
    </PageSection>
  );
}

function CashMovementsSection({ movements }: { movements: CashMovement[] }) {
  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <h2 className="text-base font-semibold text-text-strong">Libro de caja</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-app-border">
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
                <tr key={movement.id} className="border-t border-app-border">
                  <TableCell>{formatDateTime(movement.occurred_at)}</TableCell>
                  <TableCell>{cashMovementLabel(movement.movement_type)}</TableCell>
                  <TableCell className={movement.direction === "in" ? "text-status-success" : "text-status-danger"}>
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
