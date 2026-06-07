"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SummaryRow } from "@/components/ui/SummaryRow";
import { formatCurrency } from "@/lib/format/currency";
import { calculateCartTotal } from "../schemas";
import type { CartItem } from "../types";

export function PosCart({
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
  const total = calculateCartTotal(items);

  return (
    <section className="space-y-4 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div>
        <h2 className="text-base font-semibold text-text-strong">Carrito</h2>
        <p className="text-sm text-text-muted">{items.length} productos</p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-app-borderStrong bg-app-surface-muted p-4 text-center text-sm text-text-muted">
            Agrega productos para iniciar una venta.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.product.id}
              className={`rounded-md border p-3 ${
                item.quantity > item.product.stock
                  ? "border-status-warningBorder bg-status-warningBg"
                  : "border-app-border bg-app-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text-strong">{item.product.name}</p>
                  <p className="text-sm text-text-muted">
                    {formatCurrency(item.product.price)} - stock {item.product.stock}
                  </p>
                </div>
                <Button
                  className="h-8 w-8 px-0"
                  variant="ghost"
                  onClick={() => onRemove(item.product.id)}
                  aria-label={`Remover ${item.product.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <QuantityStepper
                  value={item.quantity}
                  onIncrement={() => onIncrement(item.product.id)}
                  onDecrement={() => onDecrement(item.product.id)}
                  onValueChange={(quantity) => onQuantityChange(item.product.id, quantity)}
                  incrementDisabled={item.quantity >= item.product.stock}
                  max={item.product.stock}
                />
                <span className="text-sm font-semibold text-text-strong">
                  {formatCurrency(Number(item.product.price) * item.quantity)}
                </span>
              </div>
              {item.quantity > item.product.stock ? (
                <div className="mt-3 rounded-md border border-status-warningBorder bg-app-surface p-2 text-sm text-status-warning">
                  <p>
                    Stock actualizado: disponible {item.product.stock}, cantidad en carrito{" "}
                    {item.quantity}.
                  </p>
                  {item.product.stock > 0 ? (
                    <Button
                      className="mt-2 h-8 px-3"
                      variant="secondary"
                      onClick={() => onQuantityChange(item.product.id, item.product.stock)}
                    >
                      Ajustar a {item.product.stock}
                    </Button>
                  ) : (
                    <p className="mt-1 font-medium">Sin stock disponible. Remueve el producto.</p>
                  )}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="border-t border-app-border pt-4">
        <SummaryRow label="Total" value={formatCurrency(total)} strong />
      </div>
    </section>
  );
}
