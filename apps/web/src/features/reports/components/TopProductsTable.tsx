import { formatCurrency } from "@/lib/format/currency";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import type { TopProduct } from "../types";

export function TopProductsTable({ products }: { products: TopProduct[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-950">Productos destacados</h2>
      <Table>
        <thead>
          <tr>
            <TableHeaderCell>#</TableHeaderCell>
            <TableHeaderCell>Producto</TableHeaderCell>
            <TableHeaderCell>Cantidad</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <TableEmptyRow colSpan={4}>Sin productos vendidos</TableEmptyRow>
          ) : (
            products.map((product, index) => (
              <tr key={product.product_id} className="border-t border-slate-100">
                <TableCell>{index + 1}</TableCell>
                <TableCell>{product.product_name}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>{formatCurrency(product.total)}</TableCell>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </section>
  );
}
