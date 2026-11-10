import type { ReactNode } from "react";
import { BrandMark } from "@/features/marketing/components/BrandLogo";
import { BRAND } from "@/lib/brand";
import { formatCurrency } from "@/lib/format/currency";
import { categoryTint, initials } from "../settings";
import type { PublicStorefront, PublicStorefrontProduct } from "../types";

/** "18,00" sin el "Bs": el sticker pone "Bs" chico arriba. */
export function priceDigits(value: string): string {
  return formatCurrency(value).replace(/^\s*Bs\.?\s*/i, "").trim();
}

export function StoreLogo({
  store,
  className = "",
  textClassName = "text-2xl",
}: {
  store: Pick<PublicStorefront, "name" | "logo_url">;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Logo de ${store.name}`}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-sf-ink bg-white text-[#111111] ${className}`}
    >
      {store.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen remota de la tienda, sin loader configurado
        <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={`font-display ${textClassName}`}>{initials(store.name)}</span>
      )}
    </div>
  );
}

/** Foto del producto o, sin foto, sus iniciales sobre el color de su categoria. */
export function ProductVisual({
  product,
  textClassName = "text-[54px]",
  fit = "cover",
}: {
  product: Pick<PublicStorefrontProduct, "name" | "photo_url" | "category" | "available">;
  textClassName?: string;
  /** "contain" en la pagina del producto: se ve la foto entera, sin recortar. */
  fit?: "cover" | "contain";
}) {
  if (product.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagen remota de producto, sin loader configurado
      <img
        src={product.photo_url}
        alt={product.name}
        loading="lazy"
        className={`h-full w-full bg-white ${fit === "contain" ? "object-contain" : "object-cover"} ${product.available ? "" : "opacity-60 grayscale"}`}
      />
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ backgroundColor: categoryTint(product.category) }}
    >
      <span aria-hidden="true" className={`font-display text-[#111111] opacity-85 ${textClassName}`}>
        {initials(product.name)}
      </span>
    </div>
  );
}

/** Sticker redondo con el precio. */
export function PriceSticker({ price, className = "" }: { price: string; className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-full border-2 border-sf-ink bg-sf-sticker leading-none text-sf-onSticker ${className}`}
    >
      <span className="font-receipt text-[0.65em] font-bold">Bs</span>
      <span className="font-display">{priceDigits(price)}</span>
    </div>
  );
}

/** Linea de boleta: nombre ....... precio. */
export function DottedRow({ left, right, className = "" }: { left: ReactNode; right: ReactNode; className?: string }) {
  return (
    <div className={`flex items-end gap-1.5 ${className}`}>
      <span className="min-w-0">{left}</span>
      <span aria-hidden="true" className="mb-[0.35em] min-w-[10px] flex-1 border-b-2 border-dotted border-sf-line" />
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  );
}

export function ReceiptEdge({ className = "bg-sf-ink" }: { className?: string }) {
  return <div aria-hidden="true" className={`receipt-edge h-3 ${className}`} />;
}

export function MadeWithPill() {
  return (
    <a
      href={BRAND.siteUrl}
      className="inline-flex items-center gap-2.5 rounded-full border-2 border-sf-ink bg-white px-3.5 py-2 text-sm font-semibold text-[#111111] hover:opacity-80"
    >
      <BrandMark size={24} />
      Catalogo hecho con <strong>{BRAND.name}</strong>
    </a>
  );
}

export function WhatsappIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20l1.3-5.1A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}

/** Cuanto se ahorra en porcentaje (tambien para descuentos de monto fijo). */
export function discountPercent(product: Pick<PublicStorefrontProduct, "price" | "effective_price" | "discount_type" | "discount_value">): number | null {
  const price = Number(product.price);
  const effective = Number(product.effective_price);
  if (!(price > 0) || !(effective < price)) return null;
  if (product.discount_type === "percentage") return Math.round(Number(product.discount_value));
  return Math.max(1, Math.round((1 - effective / price) * 100));
}

/** Etiqueta "-25%" en el naranja de la marca (el acento de la landing). */
export function DiscountTag({ percent, className = "" }: { percent: number; className?: string }) {
  return (
    <span className={`inline-block shrink-0 bg-[#FF4A1C] px-1.5 py-0.5 font-receipt text-[11px] font-bold leading-tight text-[#111111] ${className}`}>
      -{percent}%
    </span>
  );
}

/** "Oferta hasta el jue 13/11" en la zona horaria de la tienda. */
export function offerUntilLabel(endsAt: string | null | undefined, timeZone: string): string | null {
  if (!endsAt) return null;
  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const label = new Intl.DateTimeFormat("es-BO", { timeZone, weekday: "short", day: "numeric", month: "numeric" }).format(date);
    return `Oferta hasta el ${label.replace(",", "")}`;
  } catch {
    return null;
  }
}
