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
  onRemove,
}: {
  items: CartItem[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}) {
  const total = calculateCartTotal(items);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Carrito</h2>
        <p className="text-sm text-slate-600">{items.length} productos</p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600">
            Agrega productos para iniciar una venta.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">{item.product.name}</p>
                  <p className="text-sm text-slate-600">
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
                  incrementDisabled={item.quantity >= item.product.stock}
                />
                <span className="text-sm font-semibold text-slate-950">
                  {formatCurrency(Number(item.product.price) * item.quantity)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-slate-200 pt-4">
        <SummaryRow label="Total" value={formatCurrency(total)} strong />
      </div>
    </section>
  );
}
