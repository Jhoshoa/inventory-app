import { formatCurrency } from "@/lib/format/currency";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import type { SalesByPaymentMethod } from "../types";

export function PaymentMethodBreakdown({
  methods,
  totalSales,
}: {
  methods: SalesByPaymentMethod[];
  totalSales: string;
}) {
  const total = Number(totalSales);

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-950">Metodo de pago</h2>
      <Table>
        <thead>
          <tr>
            <TableHeaderCell>Metodo</TableHeaderCell>
            <TableHeaderCell>Ventas</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell>Participacion</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {methods.length === 0 ? (
            <TableEmptyRow colSpan={4}>Sin ventas en el rango</TableEmptyRow>
          ) : (
            methods.map((method) => {
              const percent = total > 0 ? (Number(method.total) / total) * 100 : 0;
              return (
                <tr key={method.payment_method} className="border-t border-slate-100">
                  <TableCell>{method.payment_method}</TableCell>
                  <TableCell>{method.count}</TableCell>
                  <TableCell>{formatCurrency(method.total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-700"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600">{percent.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
    </section>
  );
}
