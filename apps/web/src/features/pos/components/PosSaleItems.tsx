"use client";

import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { formatCurrency } from "@/lib/format/currency";
import type { CartItem } from "../types";

/**
 * Venta actual (tablero A · POS / Boleta): − / +, escribir la cantidad (tope = stock),
 * quitar, y "El stock cambió: quedan N y llevas M · Ajustar a N".
 */
export function PosSaleItems({
  items,
  onIncrement,
  onDecrement,
  onQuantityChange,
  onRemove,
}: {
  items: CartItem[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-app-borderStrong px-4 py-8 text-center">
        <ShoppingCart className="h-7 w-7 text-text-disabled" aria-hidden="true" />
        <p className="font-semibold text-text-strong">Todavía no hay productos</p>
        <p className="text-sm text-text-muted">Busca o escanea para agregar.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-app-border" aria-label="Productos de la venta">
      {items.map((item) => {
        const { product, quantity } = item;
        const over = quantity > product.stock;
        const discounted = Number(product.effective_price) < Number(product.price);
        return (
          <li key={product.id} className="py-2.5">
            {/* Celular: el nombre en su propia línea y debajo los controles (si no, quedaba "Coc…"). */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex-nowrap">
              <div className="min-w-0 flex-1 max-sm:basis-full">
                <p className="truncate text-sm font-bold text-text-strong">{product.name}</p>
                <p className="text-xs text-text-muted">
                  {formatCurrency(product.price)} c/u
                  {discounted ? <span className="text-status-success"> · con descuento {formatCurrency(product.effective_price)}</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Uno menos de ${product.name}`}
                  onClick={() => onDecrement(product.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-control border border-app-borderStrong hover:bg-app-surface-muted"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  inputMode="numeric"
                  aria-label={`Cantidad de ${product.name}`}
                  value={quantity}
                  onChange={(event) => {
                    const next = Number(event.target.value.replace(/[^\d]/g, ""));
                    if (next >= 1) onQuantityChange(product.id, next);
                  }}
                  onFocus={(event) => event.currentTarget.select()}
                  className={`h-9 w-12 rounded-control border text-center text-sm font-bold ${over ? "border-status-danger" : "border-app-borderStrong"}`}
                />
                <button
                  type="button"
                  aria-label={`Uno más de ${product.name}`}
                  onClick={() => onIncrement(product.id)}
                  disabled={quantity >= product.stock}
                  className="flex h-9 w-9 items-center justify-center rounded-control border border-app-borderStrong hover:bg-app-surface-muted disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <span className="w-[76px] shrink-0 text-right text-sm font-bold tabular-nums text-text-strong max-sm:ml-auto">
                {formatCurrency(Number(product.price) * quantity)}
              </span>
              <button
                type="button"
                aria-label={`Quitar ${product.name}`}
                onClick={() => onRemove(product.id)}
                className="flex h-9 w-8 shrink-0 items-center justify-center rounded-control text-text-muted hover:bg-app-surface-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {over ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-control border border-status-warningBorder bg-status-warningBg px-3 py-2 text-sm text-status-warning" role="alert">
                <span>
                  {product.stock > 0
                    ? `El stock cambió: quedan ${product.stock} y llevas ${quantity}.`
                    : "El stock cambió: ya no queda. Quítalo de la venta."}
                </span>
                {product.stock > 0 ? (
                  <button
                    type="button"
                    onClick={() => onQuantityChange(product.id, product.stock)}
                    className="h-8 rounded-control border border-status-warningBorder bg-app-surface px-3 text-[13px] font-bold"
                  >
                    Ajustar a {product.stock}
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
