/* eslint-disable @next/next/no-img-element */

import type { Product } from "../types";
import type { LabelDimensions, ProductLabelSettings } from "../label-settings";

export function ProductLabelCard({
  product,
  qrSrc,
  dimensions,
  settings,
}: {
  product: Product;
  qrSrc: string;
  dimensions: LabelDimensions;
  settings: ProductLabelSettings;
}) {
  const code = product.qr_code?.trim() ?? "";
  const isCompact = dimensions.labelHeightMm <= 10;
  const nameClass = isCompact ? "line-clamp-1 text-[5px] font-semibold" : "line-clamp-2 text-[9px] font-semibold";
  const metaClass = isCompact ? "truncate font-mono text-[4px]" : "truncate font-mono text-[7px]";
  const priceClass = isCompact ? "text-[5px] font-semibold" : "mt-1 text-[9px] font-semibold";

  return (
    <article
      className="product-print-label flex overflow-hidden border border-slate-300 bg-white text-slate-950"
      style={{
        width: `${dimensions.labelWidthMm}mm`,
        height: `${dimensions.labelHeightMm}mm`,
        padding: `${dimensions.paddingMm}mm`,
        gap: `${Math.max(dimensions.paddingMm, 1)}mm`,
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center bg-white"
        style={{ width: `${dimensions.qrSizeMm}mm`, height: `${dimensions.qrSizeMm}mm` }}
      >
        {qrSrc ? (
          <img
            src={qrSrc}
            alt={`QR ${code}`}
            style={{ width: `${dimensions.qrSizeMm}mm`, height: `${dimensions.qrSizeMm}mm` }}
          />
        ) : (
          <span className="text-[7px] text-slate-500">Generando</span>
        )}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        {settings.showName ? <p className={nameClass}>{product.name}</p> : null}
        {settings.showCode ? <p className={metaClass}>Cod: {code}</p> : null}
        {settings.showSku && product.sku ? <p className={metaClass}>SKU: {product.sku}</p> : null}
        {settings.showCategory && product.category ? (
          <p className={`${isCompact ? "text-[4px]" : "text-[7px]"} truncate text-slate-700`}>{product.category}</p>
        ) : null}
        {settings.showPrice ? <p className={priceClass}>Bs. {product.price}</p> : null}
      </div>
    </article>
  );
}
