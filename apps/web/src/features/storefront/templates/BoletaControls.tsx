"use client";

import { useEffect } from "react";
import { MAX_LINE_QUANTITY, useBoleta } from "../boleta";
import type { PublicStorefrontProduct } from "../types";

/** Pie de la tarjeta de Vitrina: agregar, "N en boleta" con +/- o agotado. */
/**
 * Si el producto ya esta en la boleta con otro precio (empezo o termino un
 * descuento desde que se agrego), la boleta toma el precio que se ve ahora.
 */
function useKeepBoletaPriceCurrent(product: PublicStorefrontProduct, inBoleta: boolean) {
  const { refresh } = useBoleta();
  useEffect(() => {
    if (inBoleta) refresh(product);
  }, [inBoleta, product, refresh]);
}

export function CardBoletaButton({
  product,
  size = "card",
}: {
  product: PublicStorefrontProduct;
  /** "large": pagina del producto, comodo de tocar tambien en el celular. */
  size?: "card" | "large";
}) {
  const { add, decrement, quantityOf } = useBoleta();
  const quantity = quantityOf(product.id);
  useKeepBoletaPriceCurrent(product, quantity > 0);
  // En el celular las tarjetas van de a dos: boton compacto, como en el diseno.
  const height = size === "large" ? "h-12 text-sm" : "h-9 text-xs sm:h-11 sm:text-sm";

  if (!product.available) {
    return (
      <button
        type="button"
        disabled
        className={`w-full border-2 border-dashed border-sf-line bg-[#E4E1D8] font-bold text-sf-muted ${height}`}
      >
        Agotado
      </button>
    );
  }
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => add(product)}
        aria-label={`Agregar ${product.name} a la boleta`}
        className={`w-full border-2 border-sf-ink bg-sf-ink font-bold text-white hover:opacity-90 ${height}`}
      >
        + Agregar<span className={size === "large" ? "" : "hidden sm:inline"}> a la boleta</span>
      </button>
    );
  }
  return (
    <div className={`flex items-center justify-between border-2 border-sf-ink bg-sf-sticker text-sf-onSticker ${height}`}>
      <button
        type="button"
        onClick={() => decrement(product.id)}
        aria-label={`Quitar un ${product.name}`}
        className="h-full w-9 text-lg font-bold sm:w-11 sm:text-xl"
      >
        −
      </button>
      <span className="whitespace-nowrap font-receipt font-bold">
        {quantity}
        <span className={size === "large" ? "" : "hidden min-[400px]:inline sm:inline"}> en boleta</span>
      </span>
      <button
        type="button"
        onClick={() => add(product)}
        disabled={quantity >= MAX_LINE_QUANTITY}
        aria-label={`Agregar otro ${product.name}`}
        className="h-full w-9 text-lg font-bold disabled:opacity-40 sm:w-11 sm:text-xl"
      >
        +
      </button>
    </div>
  );
}

/** Boton redondo "+" de la Lista de precios; con cantidad, muestra -N+. */
export function RowBoletaButton({ product }: { product: PublicStorefrontProduct }) {
  const { add, decrement, quantityOf } = useBoleta();
  const quantity = quantityOf(product.id);
  useKeepBoletaPriceCurrent(product, quantity > 0);

  if (!product.available) {
    return <span className="w-11 shrink-0 text-center text-[11px] font-bold text-[#64748B]">AGOT.</span>;
  }
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => add(product)}
        aria-label={`Agregar ${product.name} al pedido`}
        className="h-11 w-11 shrink-0 rounded-full border-2 border-sf-ink bg-sf-sticker text-xl font-bold text-sf-onSticker hover:opacity-90"
      >
        +
      </button>
    );
  }
  return (
    <div className="flex h-11 shrink-0 items-center rounded-full border-2 border-sf-ink bg-sf-sticker text-sf-onSticker">
      <button
        type="button"
        onClick={() => decrement(product.id)}
        aria-label={`Quitar un ${product.name}`}
        className="h-full w-9 text-lg font-bold"
      >
        −
      </button>
      <span className="min-w-[1.5rem] text-center font-bold">{quantity}</span>
      <button
        type="button"
        onClick={() => add(product)}
        disabled={quantity >= MAX_LINE_QUANTITY}
        aria-label={`Agregar otro ${product.name}`}
        className="h-full w-9 text-lg font-bold disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
