import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import type { StoreDayCloseReport } from "../types";

export function StoreDayCloseReportsTable({ items }: { items: StoreDayCloseReport[] }) {
  return (
    <Table mobile="cards">
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Ventas</TableHeaderCell>
          <TableHeaderCell>Efectivo esperado</TableHeaderCell>
          <TableHeaderCell>Efectivo contado</TableHeaderCell>
          <TableHeaderCell>Diferencia</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <TableEmptyRow colSpan={6}>Sin cierres registrados</TableEmptyRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.business_day_id}>
              <TableCell mobileLabel="Fecha">{formatBusinessDate(item.business_date)}</TableCell>
              <TableCell mobileLabel="Ventas">{formatCurrency(item.sales_total)}</TableCell>
              <TableCell mobileLabel="Efectivo esperado">
                {formatCurrency(item.expected_cash_amount)}
              </TableCell>
              <TableCell mobileLabel="Efectivo contado">
                {item.counted_cash_amount ? formatCurrency(item.counted_cash_amount) : "Sin conteo"}
              </TableCell>
              <TableCell mobileLabel="Diferencia">
                {item.cash_difference_amount ? formatCurrency(item.cash_difference_amount) : "No calculada"}
              </TableCell>
              <TableCell mobileLabel="Acciones">
                <TableActionGroup>
                  <Tooltip content="Ver cierre">
                    <Button variant="icon" asChild>
                      <Link href={`/dashboard/reports/store-days/${item.business_day_id}`} aria-label="Ver cierre">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </Tooltip>
                </TableActionGroup>
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}

function formatBusinessDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
