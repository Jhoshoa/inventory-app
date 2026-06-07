import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { canAdjustStock, canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { formatCurrency } from "@/lib/format/currency";
import { ProductStockDialog } from "./ProductStockDialog";
import { StockBadge } from "./ProductTable";
import type { Product } from "../types";

export function ProductDetail({ product, role }: { product: Product; role: UserRole }) {
  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Productos", href: "/dashboard/products" },
              { label: product.name },
            ]}
          />
        }
        title={product.name}
        description="Detalle operativo, codigos y auditoria de stock."
        actions={
          <>
            {canManageProducts(role) ? (
              <Button variant="secondary" asChild>
                <Link href={`/dashboard/products/${product.id}/edit`}>Editar</Link>
              </Button>
            ) : null}
            {canAdjustStock(role) ? (
              <ProductStockDialog productId={product.id} productName={product.name} />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Precio" value={formatCurrency(product.price)} />
        <InfoCard label="Stock" value={`${product.stock} ${product.unit}`} />
        <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-sm text-text-muted">Estado</p>
          <div className="mt-3">
            <StockBadge product={product} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
          <h2 className="text-base font-semibold text-text-strong">Datos</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="SKU" value={product.sku ?? "Sin SKU"} />
            <Row label="QR" value={product.qr_code ?? "Sin QR"} />
            <Row label="Categoria" value={product.category ?? "Sin categoria"} />
            <Row label="Stock minimo" value={product.min_stock.toString()} />
            <Row label="Costo" value={product.cost_price ? formatCurrency(product.cost_price) : "Sin costo"} />
          </dl>
        </div>
        <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
          <h2 className="text-base font-semibold text-text-strong">Visibilidad</h2>
          <div className="mt-4">
            <Badge variant={product.is_active ? "success" : "default"}>
              {product.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
      </div>
    </PageSection>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-text-strong">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-medium text-text-strong">{value}</dd>
    </div>
  );
}
