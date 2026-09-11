"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { canAdjustStock, canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { formatCurrency } from "@/lib/format/currency";
import { ImageUploader } from "./ImageUploader";
import { ProductStockDialog } from "./ProductStockDialog";
import { StockBadge } from "./ProductTable";
import type { Product } from "../types";

function isDiscountExpired(product: Product) {
  return Boolean(product.discount_ends_at) && new Date(product.discount_ends_at as string).getTime() <= Date.now();
}

export function ProductDetail({ product, role }: { product: Product; role: UserRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const discountActive = Boolean(product.discount_type) && !isDiscountExpired(product);

  useEffect(() => {
    if (searchParams.get("photo_error") !== "1") return;
    toast.error("El producto se creo, pero la foto no se pudo subir. Podes intentar de nuevo desde Editar.");
    router.replace(`/dashboard/products/${product.id}`);
  }, [searchParams, router, product.id]);

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
              <ProductStockDialog productId={product.id} productName={product.name} currentStock={product.stock} />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-sm text-text-muted">Precio</p>
          {discountActive ? (
            <>
              <p className="mt-2 text-sm text-text-muted line-through">{formatCurrency(product.price)}</p>
              <p className="text-2xl font-semibold text-status-success">{formatCurrency(product.effective_price)}</p>
              <Badge variant="success">
                {product.discount_type === "percentage" ? `-${product.discount_value}%` : `-${formatCurrency(product.discount_value)}`}
              </Badge>
              {product.discount_ends_at ? (
                <p className="mt-1 text-xs text-text-muted">
                  Vence el {new Date(product.discount_ends_at).toLocaleDateString("es-BO")}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-semibold text-text-strong">{formatCurrency(product.price)}</p>
              {product.discount_type ? (
                <p className="mt-1 text-xs text-text-muted">Descuento vencido</p>
              ) : null}
            </>
          )}
        </div>
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
          <h2 className="text-base font-semibold text-text-strong">Foto</h2>
          <div className="mt-4">
            <ImageUploader
              currentUrl={product.photo_url}
              productId={product.id}
              productVersion={product.version}
              onPhotoChange={() => {
                router.refresh();
              }}
            />
          </div>
        </div>
        <div className="space-y-4">
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
