/* eslint-disable @next/next/no-img-element */

import type { Product } from "../types";

export function ProductLabelCard({
  product,
  qrSrc,
  showPrice,
}: {
  product: Product;
  qrSrc: string;
  showPrice: boolean;
}) {
  const code = product.qr_code?.trim() ?? "";
  const showSku = product.sku && product.sku !== code;

  return (
    <article className="product-print-label flex h-[30mm] w-[50mm] gap-2 overflow-hidden border border-slate-300 bg-white p-[2mm] text-slate-950">
      <div className="flex h-[24mm] w-[24mm] shrink-0 items-center justify-center bg-white">
        {qrSrc ? (
          <img src={qrSrc} alt={`QR ${code}`} className="h-[24mm] w-[24mm]" />
        ) : (
          <span className="text-[7px] text-slate-500">Generando</span>
        )}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="line-clamp-2 text-[9px] font-semibold">{product.name}</p>
        <p className="mt-1 truncate font-mono text-[7px]">Cod: {code}</p>
        {showSku ? <p className="truncate font-mono text-[7px]">SKU: {product.sku}</p> : null}
        {showPrice ? <p className="mt-1 text-[9px] font-semibold">${product.price}</p> : null}
      </div>
    </article>
  );
}
