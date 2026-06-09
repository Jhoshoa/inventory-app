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
    <Table density="compact" mobile="cards">
      <thead>
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
      <tbody>
        {products.length === 0 ? (
          <TableEmptyRow colSpan={7}>No hay productos para mostrar</TableEmptyRow>
        ) : (
          products.map((product) => (
            <TableRow key={product.id} tone={productRowTone(product)}>
              <TableCell mobileLabel="Producto">
                <TableText className="font-medium text-text-strong">{product.name}</TableText>
                <TableText muted>{product.unit}</TableText>
              </TableCell>
              <TableCell mobileLabel="Codigo">
                <TableText>{product.sku ?? "Sin SKU"}</TableText>
                <TableText muted>{product.qr_code ?? "Sin QR"}</TableText>
              </TableCell>
              <TableCell mobileLabel="Categoria">
                <TableText>{product.category ?? "Sin categoria"}</TableText>
              </TableCell>
              <TableCell align="right" mobileLabel="Precio" className="font-medium text-text-strong">
                {formatCurrency(product.price)}
              </TableCell>
              <TableCell align="right" mobileLabel="Stock">
                {product.stock} / min {product.min_stock}
              </TableCell>
              <TableCell mobileLabel="Estado">
                <StockBadge product={product} />
              </TableCell>
              <TableCell align="right" mobileLabel="Acciones">
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
                      <ProductStockDialog productId={product.id} productName={product.name} trigger="icon" />
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
