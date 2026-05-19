import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { ProductDeleteDialog } from "./ProductDeleteDialog";
import { ProductStockDialog } from "./ProductStockDialog";
import type { Product } from "../types";

export function ProductTable({ products }: { products: Product[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>Producto</TableHeaderCell>
          <TableHeaderCell>Codigo</TableHeaderCell>
          <TableHeaderCell>Categoria</TableHeaderCell>
          <TableHeaderCell>Precio</TableHeaderCell>
          <TableHeaderCell>Stock</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {products.length === 0 ? (
          <TableEmptyRow colSpan={7}>No hay productos para mostrar</TableEmptyRow>
        ) : (
          products.map((product) => (
            <tr key={product.id} className="border-t border-slate-100">
              <TableCell>
                <div className="font-medium text-slate-950">{product.name}</div>
                <div className="text-xs text-slate-500">{product.unit}</div>
              </TableCell>
              <TableCell>
                <div>{product.sku ?? "Sin SKU"}</div>
                <div className="text-xs text-slate-500">{product.qr_code ?? "Sin QR"}</div>
              </TableCell>
              <TableCell>{product.category ?? "Sin categoria"}</TableCell>
              <TableCell>{formatCurrency(product.price)}</TableCell>
              <TableCell>
                {product.stock} / min {product.min_stock}
              </TableCell>
              <TableCell>
                <StockBadge product={product} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" asChild>
                    <Link href={`/dashboard/products/${product.id}`}>Ver</Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href={`/dashboard/products/${product.id}/edit`}>Editar</Link>
                  </Button>
                  <ProductStockDialog productId={product.id} productName={product.name} />
                  <ProductDeleteDialog productId={product.id} productName={product.name} />
                </div>
              </TableCell>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
}

export function StockBadge({ product }: { product: Pick<Product, "stock" | "min_stock"> }) {
  if (product.stock <= 0) return <Badge variant="danger">Sin stock</Badge>;
  if (product.stock <= product.min_stock) return <Badge variant="warning">Bajo</Badge>;
  return <Badge variant="success">Disponible</Badge>;
}
