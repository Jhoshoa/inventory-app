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
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { ProductDeleteDialog } from "./ProductDeleteDialog";
import { ProductStockDialog } from "./ProductStockDialog";
import type { Product } from "../types";

export function ProductTable({ products, role }: { products: Product[]; role: UserRole }) {
  return (
    <Table density="compact" className="max-md:block">
      <thead className="max-md:hidden">
        <tr>
          <TableHeaderCell>Producto</TableHeaderCell>
          <TableHeaderCell>Codigo</TableHeaderCell>
          <TableHeaderCell>Categoria</TableHeaderCell>
          <TableHeaderCell align="right">Precio</TableHeaderCell>
          <TableHeaderCell align="right">Stock</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell align="right">Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody className="max-md:block">
        {products.length === 0 ? (
          <TableEmptyRow colSpan={7}>No hay productos para mostrar</TableEmptyRow>
        ) : (
          products.map((product) => (
            <TableRow key={product.id} tone={productRowTone(product)} className={mobileRowClass}>
              <TableCell className={`${mobileCellClass} max-md:col-start-1 max-md:row-start-1`}>
                <TableText className="font-medium text-text-strong">{product.name}</TableText>
                <TableText muted>{product.unit}</TableText>
              </TableCell>
              <TableCell className={`${mobileCellClass} max-md:col-start-1 max-md:row-start-2`}>
                <TableText className="max-md:text-xs max-md:text-text-muted">{product.sku ?? "Sin SKU"}</TableText>
                <TableText muted className="max-md:hidden">{product.qr_code ?? "Sin QR"}</TableText>
                <TableText muted className="md:hidden">{product.category ?? "Sin categoria"}</TableText>
              </TableCell>
              <TableCell className="max-md:hidden">
                <TableText>{product.category ?? "Sin categoria"}</TableText>
              </TableCell>
              <TableCell
                align="right"
                className={`${mobileCellClass} font-medium text-text-strong max-md:col-start-2 max-md:row-start-1`}
              >
                {formatCurrency(product.price)}
              </TableCell>
              <TableCell
                align="right"
                className={`${mobileCellClass} max-md:col-start-2 max-md:row-start-2 max-md:text-xs max-md:text-text-muted`}
              >
                {product.stock} / mín {product.min_stock}
              </TableCell>
              <TableCell className={`${mobileCellClass} max-md:col-start-1 max-md:row-start-3 max-md:self-center`}>
                <StockBadge product={product} />
              </TableCell>
              <TableCell align="right" className={`${mobileCellClass} max-md:col-start-2 max-md:row-start-3`}>
                <TableActionGroup>
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
                    <Tooltip content="Ajustar stock">
                      <ProductStockDialog
                        productId={product.id}
                        productName={product.name}
                        currentStock={product.stock}
                        trigger="icon"
                      />
                    </Tooltip>
                  ) : null}
                  {canDeleteProduct(role) ? (
                    <Tooltip content="Eliminar">
                      <ProductDeleteDialog productId={product.id} productName={product.name} trigger="icon" />
                    </Tooltip>
                  ) : null}
                </TableActionGroup>
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}

// Below md each row becomes a compact two-column card: name | price, SKU + category | stock, status | actions.
const mobileRowClass =
  "max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1 max-md:px-3 max-md:py-3";
const mobileCellClass = "max-md:border-t-0 max-md:p-0";

export function StockBadge({ product }: { product: Pick<Product, "stock" | "min_stock"> }) {
  if (product.stock <= 0) return <Badge variant="danger">Sin stock</Badge>;
  if (product.stock <= product.min_stock) return <Badge variant="warning">Bajo</Badge>;
  return <Badge variant="success">Disponible</Badge>;
}

function productRowTone(product: Pick<Product, "stock" | "min_stock">) {
  if (product.stock <= 0) return "danger";
  if (product.stock <= product.min_stock) return "warning";
  return "default";
}
