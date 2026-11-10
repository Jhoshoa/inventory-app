"use client";

import { useState } from "react";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { MAX_LINE_QUANTITY, useBoleta } from "../boleta";
import type { PublicStorefrontProduct } from "../types";

/** Boton chico de las tarjetas del catalogo. */
export function StorefrontAddToBoletaButton({ product }: { product: PublicStorefrontProduct }) {
  const { add, quantityOf } = useBoleta();
  const inBoleta = quantityOf(product.id);

  if (!product.available) return null;

  return (
    <button
      type="button"
      onClick={() => add(product)}
      aria-label={inBoleta ? `Agregar otro ${product.name} (llevas ${inBoleta})` : `Agregar ${product.name} a la boleta`}
      className={`inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors ${
        inBoleta
          ? "border-transparent bg-app-surface-muted text-text-strong"
          : "border-app-borderStrong text-text-body hover:bg-app-surface-muted"
      }`}
    >
      {inBoleta ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
      {inBoleta ? `En tu boleta (${inBoleta})` : "Agregar"}
    </button>
  );
}

/** Cantidad + "Agregar a la boleta" en la pagina del producto. */
export function StorefrontProductBoletaControls({ product }: { product: PublicStorefrontProduct }) {
  const { add, quantityOf } = useBoleta();
  const [quantity, setQuantity] = useState(1);
  const inBoleta = quantityOf(product.id);

  if (!product.available) {
    return <p className="text-sm text-text-muted">Este producto esta agotado por ahora.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <QuantityStepper
        value={quantity}
        onIncrement={() => setQuantity((q) => Math.min(q + 1, MAX_LINE_QUANTITY))}
        onDecrement={() => setQuantity((q) => Math.max(q - 1, 1))}
        onValueChange={setQuantity}
        incrementDisabled={quantity >= MAX_LINE_QUANTITY}
        max={MAX_LINE_QUANTITY}
      />
      <Button
        onClick={() => {
          add(product, quantity);
          setQuantity(1);
        }}
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        Agregar a la boleta
      </Button>
      {inBoleta ? <span className="text-xs text-text-muted">Llevas {inBoleta} en tu boleta</span> : null}
    </div>
  );
}
