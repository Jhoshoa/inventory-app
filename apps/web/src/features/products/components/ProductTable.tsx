"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MouseEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { canAdjustStock, canDeleteProduct, canManageProducts } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { formatCurrency } from "@/lib/format/currency";
import {
  expiryLabel,
  hasActiveDiscount,
  locationsLabel,
  productInitials,
  productMeta,
  stockTag,
  thumbColor,
  type StockTone,
} from "../list";
import type { Product } from "../types";
import { ProductDeleteDialog } from "./ProductDeleteDialog";
import { ProductStockDialog } from "./ProductStockDialog";
import { QrPreviewDialog } from "./QrPreviewDialog";

const TONE_CLASS: Record<StockTone, string> = {
  ok: "bg-status-successBg text-status-success",
  warn: "bg-status-warningBg text-status-warning",
  bad: "bg-status-dangerBg text-status-danger",
};

/**
 * Lista de productos (tablero P01): tarjetas en el celular y tabla desde 768 px.
 * El dueño ve "Ajustar stock" y el menú ⋯; el cajero solo abre el detalle.
 */
export function ProductTable({
  products,
  role,
  today = null,
}: {
  products: Product[];
  role: UserRole;
  /** Fecha local (YYYY-MM-DD) para "3 días" en Vence; null hasta montar. */
  today?: string | null;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [showingQr, setShowingQr] = useState<Product | null>(null);
  const owner = canManageProducts(role);
  const adjust = canAdjustStock(role);
  const remove = canDeleteProduct(role);

  function openRow(event: MouseEvent<HTMLTableRowElement>, product: Product) {
    if ((event.target as HTMLElement).closest("a, button, input, select, [role='menu']")) return;
    router.push(`/dashboard/products/${product.id}`);
  }

  return (
    <>
      <ul className="flex flex-col gap-2.5 md:hidden" aria-label="Productos">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} today={today} />
          </li>
        ))}
      </ul>

      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="bg-app-surface-muted text-left text-xs font-semibold text-text-muted">
            <th scope="col" className="px-3 py-2.5">Producto</th>
            <th scope="col" className="hidden px-3 py-2.5 lg:table-cell">Dónde está</th>
            <th scope="col" className="px-3 py-2.5">Stock</th>
            <th scope="col" className="hidden px-3 py-2.5 lg:table-cell">Vence</th>
            <th scope="col" className="px-3 py-2.5 text-right">Precio</th>
            {owner ? (
              <th scope="col" className="px-3 py-2.5 text-right">
                <span className="sr-only">Acciones</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const tag = stockTag(product);
            const expiry = expiryLabel(product.next_expiry, today);
            const place = locationsLabel(product);
            return (
              <tr
                key={product.id}
                onClick={(event) => openRow(event, product)}
                className="cursor-pointer border-t border-app-border hover:bg-app-surface-muted/60"
              >
                {/* w-full + max-w-0: la columna toma el espacio libre y el nombre se corta con "…". */}
                <td className="w-full max-w-0 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProductThumb product={product} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="block truncate font-bold text-text-strong hover:text-brand-700"
                      >
                        {product.name}
                      </Link>
                      <span className="block truncate text-xs text-text-muted">{productMeta(product)}</span>
                      {/* Tablet: "Dónde está" y "Vence" van debajo del nombre. */}
                      {place ? <span className="block truncate text-xs text-text-muted lg:hidden">{place}</span> : null}
                      {expiry ? (
                        <span className={`block truncate text-xs lg:hidden ${expiry.urgent ? "font-semibold text-status-warning" : "text-text-muted"}`}>
                          Vence {expiry.label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="hidden max-w-[180px] truncate px-3 py-2.5 text-text-muted lg:table-cell">{place ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <StockTag label={tag.label} tone={tag.tone} />
                </td>
                <td className={`hidden whitespace-nowrap px-3 py-2.5 lg:table-cell ${expiry?.urgent ? "font-semibold text-status-warning" : "text-text-muted"}`}>
                  {expiry?.label ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <PriceCell product={product} />
                </td>
                {owner ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {adjust ? (
                        <ProductStockDialog
                          productId={product.id}
                          productName={product.name}
                          currentStock={product.stock}
                          trigger="compact"
                        />
                      ) : null}
                      <Menu label={`Más acciones de ${product.name}`} trigger="⋯" triggerClassName="h-[34px] w-[34px] rounded-[10px]">
                        <MenuItem href={`/dashboard/products/${product.id}`}>Ver detalle</MenuItem>
                        <MenuItem href={`/dashboard/products/${product.id}/edit`}>Editar</MenuItem>
                        <MenuItem href={`/dashboard/products/${product.id}#donde-esta`}>Dónde está</MenuItem>
                        {product.qr_code ? <MenuItem onSelect={() => setShowingQr(product)}>Ver código QR</MenuItem> : null}
                        {remove ? (
                          <MenuItem tone="danger" onSelect={() => setDeleting(product)}>
                            Eliminar…
                          </MenuItem>
                        ) : null}
                      </Menu>
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      {deleting ? (
        <ProductDeleteDialog
          key={deleting.id}
          productId={deleting.id}
          productName={deleting.name}
          trigger="none"
          open
          onOpenChange={(next) => !next && setDeleting(null)}
          onDeleted={() => setDeleting(null)}
        />
      ) : null}
      <QrPreviewDialog
        open={showingQr !== null}
        code={showingQr?.qr_code ?? ""}
        productName={showingQr?.name}
        onClose={() => setShowingQr(null)}
      />
    </>
  );
}

function ProductCard({ product, today }: { product: Product; today: string | null }) {
  const tag = stockTag(product);
  const expiry = expiryLabel(product.next_expiry, today);
  const place = product.locations?.[0]?.label;
  const detail = [product.category ?? "Sin categoría", expiry?.urgent ? `vence ${expiry.label}` : place]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/dashboard/products/${product.id}`}
      className="flex items-center gap-3 rounded-[14px] border border-app-border bg-app-surface p-2.5 focus:outline-none focus:ring-2 focus:ring-focus"
    >
      <ProductThumb product={product} size="lg" />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[15px] text-text-strong">{product.name}</strong>
        <span className="block truncate text-xs text-text-muted">{detail}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StockTag label={tag.label} tone={tag.tone} />
        <PriceCell product={product} />
      </span>
    </Link>
  );
}

function ProductThumb({ product, size }: { product: Product; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-[52px] w-[52px]" : "h-10 w-10";
  if (product.photo_url) {
    return <img src={product.photo_url} alt="" loading="lazy" className={`${box} shrink-0 rounded-[10px] object-cover`} />;
  }
  const color = thumbColor(product.name);
  return (
    <span
      aria-hidden="true"
      style={{ background: color.bg, color: color.fg }}
      className={`${box} flex shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold`}
    >
      {productInitials(product.name)}
    </span>
  );
}

function StockTag({ label, tone }: { label: string; tone: StockTone }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

function PriceCell({ product }: { product: Product }) {
  const discounted = hasActiveDiscount(product);
  return (
    <span className="block text-right">
      <span className="block font-bold text-text-strong">{formatCurrency(discounted ? product.effective_price : product.price)}</span>
      {discounted ? (
        <span className="block text-xs text-text-muted line-through">
          <span className="sr-only">Antes </span>
          {formatCurrency(product.price)}
        </span>
      ) : null}
    </span>
  );
}

export function StockBadge({ product }: { product: Pick<Product, "stock" | "min_stock"> }) {
  if (product.stock <= 0) return <Badge variant="danger">Sin stock</Badge>;
  if (product.stock <= product.min_stock) return <Badge variant="warning">Bajo</Badge>;
  return <Badge variant="success">Disponible</Badge>;
}
