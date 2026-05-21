import { PackageCheck, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { formatCurrency } from "@/lib/format/currency";
import { averageTicket } from "../schemas";
import type { SalesReport } from "../types";

export function SalesReportSummary({ report }: { report: SalesReport }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total vendido"
        value={formatCurrency(report.total_sales)}
        icon={TrendingUp}
      />
      <MetricCard
        label="Ventas"
        value={report.sales_count.toString()}
        icon={ReceiptText}
      />
      <MetricCard
        label="Items vendidos"
        value={report.items_count.toString()}
        icon={PackageCheck}
      />
      <MetricCard
        label="Ticket promedio"
        value={formatCurrency(averageTicket(report.total_sales, report.sales_count))}
        icon={WalletCards}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden={true} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
