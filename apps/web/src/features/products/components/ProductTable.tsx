import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  canAdjustStock,
  canDeleteProduct,
  canManageProducts,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
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

export function ProductTable({ products, role }: { products: Product[]; role: UserRole }) {
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
            <tr key={product.id} className="border-t border-app-border hover:bg-app-surface-muted">
              <TableCell>
                <div className="font-medium text-text-strong">{product.name}</div>
                <div className="text-xs text-text-muted">{product.unit}</div>
              </TableCell>
              <TableCell>
                <div>{product.sku ?? "Sin SKU"}</div>
                <div className="text-xs text-text-muted">{product.qr_code ?? "Sin QR"}</div>
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
                  <Tooltip content="Ver">
                    <Button variant="icon" asChild>
                      <Link href={`/dashboard/products/${product.id}`} aria-label="Ver">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </Tooltip>
                  {canManageProducts(role) ? (
                    <Tooltip content="Editar">
                      <Button variant="icon" asChild>
                        <Link href={`/dashboard/products/${product.id}/edit`} aria-label="Editar">
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </Tooltip>
                  ) : null}
                  {canAdjustStock(role) ? (
                    <ProductStockDialog productId={product.id} productName={product.name} />
                  ) : null}
                  {canDeleteProduct(role) ? (
                    <ProductDeleteDialog productId={product.id} productName={product.name} />
                  ) : null}
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
