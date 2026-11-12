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
import { LocationList } from "@/features/store-locations/components/LocationList";
import { ProductLocationsDialog } from "@/features/store-locations/components/ProductLocationsDialog";
import type { StoreLocation } from "@/features/store-locations/types";
import { ImageUploader } from "./ImageUploader";
import { ProductBatches } from "./ProductBatches";
import { ProductStockDialog } from "./ProductStockDialog";
import { StockBadge } from "./ProductTable";
import type { Product, ProductBatch } from "../types";

function isDiscountExpired(product: Product) {
  return Boolean(product.discount_ends_at) && new Date(product.discount_ends_at as string).getTime() <= Date.now();
}

export function ProductDetail({
  product,
  role,
  batches,
  storeLocations,
}: {
  product: Product;
  role: UserRole;
  /** null si no se pudieron cargar: el detalle se muestra igual. */
  batches?: { items: ProductBatch[]; untracked_quantity: number } | null;
  /** Solo para el dueno, que es quien asigna ubicaciones. */
  storeLocations?: StoreLocation[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const discountActive = Boolean(product.discount_type) && !isDiscountExpired(product);

  // Avisos al volver del formulario (tablero P02): creado / guardado, y si la foto
  // o "Dónde está" no se pudieron guardar, se avisa pero el producto ya está.
  useEffect(() => {
    const created = searchParams.get("creado") === "1";
    const saved = searchParams.get("guardado") === "1";
    const photoFailed = searchParams.get("photo_error") === "1";
    const placesFailed = searchParams.get("lugares_error") === "1";
    if (!created && !saved && !photoFailed && !placesFailed) return;
    if (created) toast.success("Producto creado", { id: "product-created" });
    if (saved) toast.success("Cambios guardados", { id: "product-saved" });
    if (photoFailed) toast.error("El producto se guardó, pero la foto no se pudo subir. Intenta de nuevo desde Editar.", { id: "product-photo-error" });
    if (placesFailed) toast.error('El producto se guardó, pero "Dónde está" no. Márcalo de nuevo en Ubicación.', { id: "product-places-error" });
    router.replace(`/dashboard/products/${product.id}`);
  }, [searchParams, router, product.id]);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Inicio", href: "/dashboard" },
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
              <ProductStockDialog
                productId={product.id}
                productName={product.name}
                currentStock={product.stock}
                batches={batches?.items}
              />
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
          <div id="donde-esta" className="scroll-mt-20 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-text-strong">Ubicacion</h2>
              {canManageProducts(role) && storeLocations ? (
                <ProductLocationsDialog
                  productId={product.id}
                  current={product.locations ?? []}
                  storeLocations={storeLocations}
                />
              ) : null}
            </div>
            {product.locations && product.locations.length > 0 ? (
              <LocationList locations={product.locations} className="mt-3" />
            ) : (
              <p className="mt-3 text-sm text-text-muted">Sin ubicacion asignada.</p>
            )}
          </div>
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

      {batches ? (
        <ProductBatches
          productId={product.id}
          productName={product.name}
          unit={product.unit}
          stock={product.stock}
          batches={batches.items}
          untrackedQuantity={batches.untracked_quantity}
          canRemove={canAdjustStock(role)}
        />
      ) : null}
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
