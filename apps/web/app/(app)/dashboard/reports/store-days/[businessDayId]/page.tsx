import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { closingDay, closingHours } from "@/features/reports/closings";
import { CashMovementList } from "@/features/reports/components/CashMovementList";
import { ClosingBreakdown } from "@/features/reports/components/ClosingBreakdown";
import { businessDateKey } from "@/features/sales/list";
import { getCloseReport, listCashMovements } from "@/features/store-day/api";
import { listUsers } from "@/features/users/api";
import { canViewStoreDayReports } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format/currency";

export const metadata: Metadata = { title: "Cierre de caja" };

// Página de un cierre (tablero P08 · "Ver página del cierre"): las cuentas y el libro de caja del día.
export default async function StoreDayCloseReportPage({ params }: { params: Promise<{ businessDayId: string }> }) {
  const session = await requireSession();
  if (!canViewStoreDayReports(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede ver el resumen del cierre." />;
  }

  const { businessDayId } = await params;
  const [report, movements, users] = await Promise.all([
    getCloseReport(businessDayId),
    listCashMovements({ business_day_id: businessDayId, include_voided: true, limit: 100, offset: 0 }),
    listUsers(100, 0),
  ]);
  if (!report.ok && (report.error.status === 404 || report.error.status === 422)) notFound();
  const names = users.ok ? Object.fromEntries(users.data.items.map((user) => [user.id, user.full_name || user.email.split("@")[0]])) : {};

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <header>
        <Link
          href="/dashboard/reports/store-days"
          className="-ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[13px] font-semibold text-text-muted hover:text-text-strong"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Cierres de caja
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">
          {report.ok ? `Cierre del ${closingDay(report.data.business_date, true)}` : "Cierre de caja"}
        </h1>
        {report.ok ? (
          <p className="text-sm text-text-muted">
            {closingHours(report.data)} · vendido {formatCurrency(report.data.sales_total)}
          </p>
        ) : null}
      </header>

      {!report.ok ? (
        <DataFetchError resource="el cierre" error={report.error.message} />
      ) : (
        <>
          <section aria-label="Cuentas del cierre" className="rounded-card border border-app-border bg-app-surface p-4">
            <ClosingBreakdown report={report.data} closedBy={names[report.data.closed_by_user_id] ?? null} />
          </section>
          <section aria-labelledby="closing-movements" className="flex flex-col gap-2">
            <h2 id="closing-movements" className="text-[15px] font-bold text-text-strong">
              Movimientos de caja del día
            </h2>
            {!movements.ok ? (
              <DataFetchError resource="los movimientos de caja" error={movements.error.message} />
            ) : movements.data.items.length === 0 ? (
              <p className="text-sm text-text-muted">Ese día no hubo entradas ni salidas de caja.</p>
            ) : (
              <CashMovementList movements={movements.data.items} names={names} today={businessDateKey()} showDay={false} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
