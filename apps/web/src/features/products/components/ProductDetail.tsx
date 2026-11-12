"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { canAdjustStock, canDeleteProduct, canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { formatCurrency } from "@/lib/format/currency";
import { ProductLocationsDialog } from "@/features/store-locations/components/ProductLocationsDialog";
import { LOCATION_KIND_LABEL, type StoreLocation } from "@/features/store-locations/types";
import { BATCH_STATUS_LABEL, BATCH_STATUS_VARIANT } from "../batches";
import {
  batchDateLine,
  daysLeftText,
  discountSummary,
  duplicateHref,
  formatBatchDate,
  hasLiveDiscount,
  liveBatches,
  movementLabel,
  movementWhen,
  profitLine,
  stockState,
} from "../detail";
import { shortDate } from "../form";
import { productInitials, thumbColor, unitShort } from "../list";
import { DEFAULT_ALERT_DAYS } from "../schemas";
import type { Product, ProductBatch, StockMovement } from "../types";
import { ProductDeleteDialog } from "./ProductDeleteDialog";
import { ProductStockDialog } from "./ProductStockDialog";
import { QrPreviewDialog } from "./QrPreviewDialog";

type Removal = { quantity: number; batchId: string; reason?: string };

/**
 * Detalle del producto (tablero P03). El dueño ajusta stock, edita, cambia "Dónde
 * está", retira lotes, duplica y elimina; el cajero ve todo menos costo y margen y
 * solo tiene "Ver QR".
 */
export function ProductDetail({
  product,
  role,
  batches,
  movements = null,
  storeLocations,
  storefrontEnabled = false,
  defaultAlertDays = DEFAULT_ALERT_DAYS,
}: {
  product: Product;
  role: UserRole;
  /** null si no se pudieron cargar: el detalle se muestra igual. */
  batches?: { items: ProductBatch[]; untracked_quantity: number } | null;
  /** Últimos movimientos; null si no se pudieron cargar. */
  movements?: StockMovement[] | null;
  /** Solo para el dueño, que es quien marca "Dónde está". */
  storeLocations?: StoreLocation[];
  /** Catálogo público encendido: con el producto activo muestra "En el catálogo". */
  storefrontEnabled?: boolean;
  defaultAlertDays?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const owner = canManageProducts(role);
  const adjust = canAdjustStock(role);
  const [stockOpen, setStockOpen] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Las horas de los movimientos van en la hora del navegador: se escriben al cargar
  // en el navegador (en el servidor saldrían en otra zona horaria y no coincidirían).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const units = unitShort(product.unit);
  const lots = liveBatches(batches?.items ?? []);
  const nextLot = lots[0];
  const state = stockState(product);
  const discount = discountSummary(product);
  const profit = owner ? profitLine(product) : null;
  const inCatalog = product.is_active && storefrontEnabled;

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
    if (placesFailed) toast.error('El producto se guardó, pero "Dónde está" no. Márcalo de nuevo con "Cambiar".', { id: "product-places-error" });
    router.replace(`/dashboard/products/${product.id}`);
  }, [searchParams, router, product.id]);

  // "Dónde está" desde el ⋯ de la lista llega con #donde-esta: se abre la ventana.
  useEffect(() => {
    if (owner && storeLocations && window.location.hash === "#donde-esta") setPlacesOpen(true);
  }, [owner, storeLocations]);

  const color = thumbColor(product.name);
  const thumb = product.photo_url ? (
    <img src={product.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-card object-cover sm:h-20 sm:w-20" />
  ) : (
    <span
      aria-hidden="true"
      style={{ background: color.bg, color: color.fg }}
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card text-lg font-extrabold sm:h-20 sm:w-20"
    >
      {productInitials(product.name)}
    </span>
  );

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-text-muted">
          <Link href="/dashboard/products" className="inline-flex items-center hover:text-text-strong">
            <ChevronLeft className="h-4 w-4 sm:hidden" aria-hidden="true" />
            Productos
          </Link>
          {product.category ? (
            <span className="truncate max-sm:hidden">
              <span aria-hidden="true">/ </span>
              {product.category}
            </span>
          ) : null}
        </nav>
        {owner ? (
          <div className="sm:hidden">
            <Menu label={`Más acciones de ${product.name}`} trigger="⋯" triggerClassName="h-11 w-11 text-lg">
              {product.qr_code ? <MenuItem onSelect={() => setQrOpen(true)}>Ver QR</MenuItem> : null}
              <MenuItem href={duplicateHref(product.id)}>Duplicar</MenuItem>
              {canDeleteProduct(role) ? (
                <MenuItem tone="danger" onSelect={() => setDeleteOpen(true)}>
                  Eliminar…
                </MenuItem>
              ) : null}
            </Menu>
          </div>
        ) : null}
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {thumb}
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-text-strong sm:text-[26px]">{product.name}</h1>
            <p className="truncate text-sm text-text-muted">
              <span className="sm:hidden">{[product.category, product.sku].filter(Boolean).join(" · ") || "Sin categoría"}</span>
              <span className="max-sm:hidden">
                {[product.sku, product.qr_code].filter(Boolean).join(" · ") || "Sin SKU ni código"}
              </span>
            </p>
            {inCatalog ? (
              <Badge variant="success" className="mt-1">
                En el catálogo
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-sm:hidden">
          {product.qr_code ? (
            <Button variant="secondary" onClick={() => setQrOpen(true)}>
              Ver QR
            </Button>
          ) : null}
          {owner ? (
            <>
              <Button variant="secondary" asChild>
                <Link href={`/dashboard/products/${product.id}/edit`}>Editar</Link>
              </Button>
              {adjust ? <Button onClick={() => setStockOpen(true)}>Ajustar stock</Button> : null}
              <Menu label={`Más acciones de ${product.name}`} trigger="⋯" triggerClassName="h-control w-[var(--height-control)] text-lg">
                <MenuItem href={duplicateHref(product.id)}>Duplicar</MenuItem>
                {canDeleteProduct(role) ? (
                  <MenuItem tone="danger" onSelect={() => setDeleteOpen(true)}>
                    Eliminar…
                  </MenuItem>
                ) : null}
              </Menu>
            </>
          ) : null}
        </div>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Precio">
          <strong className="text-[22px] font-extrabold text-text-strong">
            {formatCurrency(hasLiveDiscount(product) ? product.effective_price : product.price)}
          </strong>
          {discount ? (
            <span className="text-xs text-text-muted">
              <span className="line-through">
                <span className="sr-only">Antes </span>
                {formatCurrency(product.price)}
              </span>{" "}
              · {discount}
            </span>
          ) : product.discount_type ? (
            <span className="text-xs text-text-muted">Descuento vencido</span>
          ) : null}
        </Kpi>
        {owner ? (
          <Kpi label="Costo y margen" className="max-lg:order-3">
            {product.cost_price ? (
              <>
                <strong className="text-[22px] font-extrabold text-text-strong">{formatCurrency(product.cost_price)}</strong>
                <span className={`text-xs ${profit?.startsWith("Pierdes") ? "font-semibold text-status-danger" : "text-text-muted"}`}>{profit}</span>
              </>
            ) : (
              <>
                <strong className="text-[22px] font-extrabold text-text-muted">—</strong>
                <Link href={`/dashboard/products/${product.id}/edit`} className="text-xs font-bold text-brand-700 hover:underline">
                  Agregar el costo
                </Link>
              </>
            )}
          </Kpi>
        ) : null}
        <Kpi label="Stock">
          <strong className="text-[22px] font-extrabold text-text-strong">
            {product.stock} {units}
          </strong>
          <span className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
            <Badge variant={state.tone}>{state.label}</Badge> Avisa si baja de {product.min_stock}
          </span>
        </Kpi>
        <Kpi label="Próximo vencimiento" className="max-lg:order-4">
          {nextLot ? (
            <>
              <strong className={`text-[22px] font-extrabold ${nextLot.status === "ok" ? "text-text-strong" : "text-status-warning"}`}>
                {shortDate(nextLot.expires_on)}
              </strong>
              <span className="text-xs text-text-muted">
                {nextLot.quantity_remaining} {units} {daysLeftText(nextLot.days_left)}
              </span>
            </>
          ) : (
            <>
              <strong className="text-[22px] font-extrabold text-text-muted">—</strong>
              <span className="text-xs text-text-muted">Sin lotes con fecha</span>
            </>
          )}
        </Kpi>
      </section>

      {owner ? (
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {adjust ? (
            <Button className="!h-12" onClick={() => setStockOpen(true)}>
              Ajustar stock
            </Button>
          ) : null}
          <Button variant="secondary" className="!h-12" asChild>
            <Link href={`/dashboard/products/${product.id}/edit`}>Editar</Link>
          </Button>
        </div>
      ) : product.qr_code ? (
        <Button variant="secondary" className="!h-12 sm:hidden" onClick={() => setQrOpen(true)}>
          Ver QR
        </Button>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {batches ? (
            <Card
              title="Lotes y vencimientos"
              subtitle={`Sale primero el que vence antes · sin fecha: ${batches.untracked_quantity} ${units}`}
            >
              {lots.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Sin lotes con fecha.{adjust ? " Al agregar stock puedes poner cuándo vence y entra como un lote." : ""}
                </p>
              ) : (
                <>
                  <ul className="flex flex-col gap-2 md:hidden" aria-label="Lotes">
                    {lots.map((lot) => (
                      <li key={lot.id} className="flex items-center gap-3 rounded-[12px] border border-app-border px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-text-strong">
                            {formatBatchDate(lot)} · quedan {lot.quantity_remaining}
                          </p>
                          <p className="text-xs text-text-muted">{capitalize(daysLeftText(lot.days_left))}</p>
                        </div>
                        <Badge variant={BATCH_STATUS_VARIANT[lot.status]}>{BATCH_STATUS_LABEL[lot.status]}</Badge>
                        {adjust ? <RemoveButton lot={lot} onRemove={setRemoval} /> : null}
                      </li>
                    ))}
                  </ul>
                  <table className="w-full border-collapse text-sm max-md:hidden">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-text-muted">
                        <th scope="col" className="py-2 pr-3">Vence</th>
                        <th scope="col" className="py-2 pr-3">Estado</th>
                        <th scope="col" className="py-2 pr-3 text-right">Quedan</th>
                        <th scope="col" className="py-2 pr-3 text-right">Entraron</th>
                        {adjust ? (
                          <th scope="col" className="py-2 text-right">
                            <span className="sr-only">Acción</span>
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map((lot) => (
                        <tr key={lot.id} className="border-t border-app-border">
                          <td className="py-2.5 pr-3">
                            <span className="block font-bold text-text-strong">{formatBatchDate(lot)}</span>
                            <span className="text-xs text-text-muted">{batchDateLine(lot)}</span>
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge variant={BATCH_STATUS_VARIANT[lot.status]}>{BATCH_STATUS_LABEL[lot.status]}</Badge>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{lot.quantity_remaining}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-text-muted">{lot.quantity_initial}</td>
                          {adjust ? (
                            <td className="py-2.5 text-right">
                              <RemoveButton lot={lot} onRemove={setRemoval} />
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </Card>
          ) : null}

          <Card
            title="Movimientos"
            action={
              <Link
                href={`/dashboard/reports/stock-movements?product_id=${encodeURIComponent(product.id)}`}
                className="text-sm font-bold text-brand-700 hover:underline"
              >
                Ver todos
              </Link>
            }
          >
            {movements === null ? (
              <p className="text-sm text-text-muted">No se pudieron cargar los movimientos.</p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no hay movimientos.</p>
            ) : (
              <ul className="divide-y divide-app-border" aria-label="Últimos movimientos">
                {movements.slice(0, 5).map((movement) => (
                  <li key={movement.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-text-body">
                      {now ? `${movementWhen(movement.created_at, now)} · ` : null}
                      {movementLabel(movement)}
                    </span>
                    <span
                      className={`shrink-0 font-bold tabular-nums ${movement.quantity_delta < 0 ? "text-status-danger" : "text-status-success"}`}
                    >
                      {movement.quantity_delta > 0 ? "+" : "−"}
                      {Math.abs(movement.quantity_delta)}
                      <span className="font-normal text-text-muted"> → {movement.stock_after}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card
          id="donde-esta"
          title="Dónde está"
          action={
            owner && storeLocations ? (
              <Button variant="secondary" className="!h-9 !px-3 text-[13px]" onClick={() => setPlacesOpen(true)}>
                {product.locations && product.locations.length > 0 ? "Cambiar" : "Elegir lugares"}
              </Button>
            ) : null
          }
        >
          {product.locations && product.locations.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {product.locations.map((location) => (
                <li key={location.id} className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 font-semibold text-text-strong">{location.label}</span>
                  <Badge variant={location.kind === "display" ? "success" : "default"}>{LOCATION_KIND_LABEL[location.kind]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">
              Sin lugar asignado.{owner ? " Márcalo para que los cajeros lo encuentren al vender." : ""}
            </p>
          )}
        </Card>
      </div>

      {adjust ? (
        <ProductStockDialog
          key={removal ? `remove-${removal.batchId}` : "adjust"}
          trigger="none"
          open={stockOpen || removal !== null}
          onOpenChange={(open) => {
            if (open) return;
            setStockOpen(false);
            setRemoval(null);
          }}
          productId={product.id}
          productName={product.name}
          currentStock={product.stock}
          unit={product.unit}
          batches={lots}
          preset={removal ?? undefined}
          defaultAlertDays={defaultAlertDays}
        />
      ) : null}
      {owner && storeLocations ? (
        <ProductLocationsDialog
          trigger={false}
          open={placesOpen}
          onOpenChange={setPlacesOpen}
          productId={product.id}
          current={product.locations ?? []}
          storeLocations={storeLocations}
        />
      ) : null}
      {canDeleteProduct(role) ? (
        <ProductDeleteDialog productId={product.id} productName={product.name} trigger="none" open={deleteOpen} onOpenChange={setDeleteOpen} />
      ) : null}
      <QrPreviewDialog
        open={qrOpen}
        code={product.qr_code ?? ""}
        productName={product.name}
        productId={owner ? product.id : undefined}
        onClose={() => setQrOpen(false)}
      />
    </div>
  );
}

function RemoveButton({ lot, onRemove }: { lot: ProductBatch; onRemove: (removal: Removal) => void }) {
  return (
    <Button
      variant="secondary"
      className="!h-9 shrink-0 !px-3 text-[13px]"
      aria-label={`Retirar lote que vence el ${formatBatchDate(lot)}`}
      onClick={() =>
        onRemove({
          quantity: -lot.quantity_remaining,
          batchId: lot.id,
          reason: lot.status === "expired" ? "Vencido" : undefined,
        })
      }
    >
      Retirar
    </Button>
  );
}

function Kpi({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-card border border-app-border bg-app-surface p-3.5 ${className}`}>
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function Card({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-20 rounded-card border border-app-border bg-app-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-text-strong">{title}</h2>
          {subtitle ? <p className="text-xs text-text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
