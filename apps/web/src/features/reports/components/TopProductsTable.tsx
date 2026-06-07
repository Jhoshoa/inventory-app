import { formatCurrency } from "@/lib/format/currency";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import type { TopProduct } from "../types";

export function TopProductsTable({ products }: { products: TopProduct[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-text-strong">Productos destacados</h2>
      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell align="right">#</TableHeaderCell>
            <TableHeaderCell>Producto</TableHeaderCell>
            <TableHeaderCell align="right">Cantidad</TableHeaderCell>
            <TableHeaderCell align="right">Total</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <TableEmptyRow colSpan={4}>Sin productos vendidos</TableEmptyRow>
          ) : (
            products.map((product, index) => (
              <TableRow key={product.product_id}>
                <TableCell align="right">{index + 1}</TableCell>
                <TableCell>
                  <TableText className="font-medium text-text-strong">{product.product_name}</TableText>
                </TableCell>
                <TableCell align="right">{product.quantity}</TableCell>
                <TableCell align="right" className="font-semibold text-text-strong">
                  {formatCurrency(product.total)}
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </section>
  );
}
