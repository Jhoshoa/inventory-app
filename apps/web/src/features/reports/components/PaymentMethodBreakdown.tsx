import { formatCurrency } from "@/lib/format/currency";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
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
      <h2 className="text-base font-semibold text-text-strong">Metodo de pago</h2>
      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Metodo</TableHeaderCell>
            <TableHeaderCell align="right">Ventas</TableHeaderCell>
            <TableHeaderCell align="right">Total</TableHeaderCell>
            <TableHeaderCell align="right">Participacion</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {methods.length === 0 ? (
            <TableEmptyRow colSpan={4}>Sin ventas en el rango</TableEmptyRow>
          ) : (
            methods.map((method) => {
              const percent = total > 0 ? (Number(method.total) / total) * 100 : 0;
              return (
                <TableRow key={method.payment_method}>
                  <TableCell>{method.payment_method}</TableCell>
                  <TableCell align="right">{method.count}</TableCell>
                  <TableCell align="right" className="font-semibold text-text-strong">
                    {formatCurrency(method.total)}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-app-surface-muted">
                        <div
                          className="h-full rounded-full bg-brand-700"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-text-muted">{percent.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </tbody>
      </Table>
    </section>
  );
}
