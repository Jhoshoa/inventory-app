import type { StoreResponse } from "@/features/settings/types";
import { PRODUCT_CODE_MESSAGE, moneyNumber, type DiscountPolicy } from "./schemas";
import type { ProductDiscountType, ProductFormValues } from "./types";

/** Política de descuentos de la tienda para validar en el formulario (la API la vuelve a revisar). */
export function discountPolicyFromStore(
  store: Pick<
    StoreResponse,
    "allow_percentage_discount" | "max_percentage_discount" | "allow_manual_discount" | "max_manual_discount_amount"
  >,
): DiscountPolicy {
  return {
    percentage: { allowed: store.allow_percentage_discount, max: Number(store.max_percentage_discount) || 0 },
    fixed: { allowed: store.allow_manual_discount, max: Number(store.max_manual_discount_amount) || 0 },
  };
}

/** "Ganas Bs 6,50 por unidad (35%)": ganancia sobre el precio de venta. null si falta precio o costo. */
export function margin(priceText: string, costText: string): { amount: number; percent: number } | null {
  const price = moneyNumber(priceText);
  const cost = moneyNumber(costText);
  if (price === null || cost === null || price <= 0) return null;
  const amount = Math.round((price - cost) * 100) / 100;
  return { amount, percent: Math.round((amount / price) * 100) };
}

/** Precio al vender con el descuento escrito (como `effective_price` de la API); null sin descuento válido. */
export function discountedPrice(priceText: string, type: ProductDiscountType | "", valueText: string): number | null {
  const price = moneyNumber(priceText);
  const value = moneyNumber(valueText);
  if (!type || price === null || value === null || value <= 0) return null;
  const result = type === "percentage" ? price - (price * value) / 100 : price - value;
  return Math.max(Math.round(result * 100) / 100, 0);
}

/**
 * Los 409 y 403 de la API van en su campo, no solo arriba (tablero P02). Devuelve
 * {} si el mensaje no corresponde a un campo.
 */
export function productApiFieldErrors(
  status: number,
  message: string,
): Partial<Record<keyof ProductFormValues, string>> {
  const text = message.toLowerCase();
  if (status === 409) {
    if (text.includes("sku")) return { sku: "Ese SKU ya lo tiene otro producto." };
    if (text.includes("codigo escaneable") || text.includes("código escaneable")) {
      return { qr_code: "El código escaneable ya está en uso por otro producto." };
    }
    if (text.includes("nombre")) return { name: "Ya hay un producto con ese nombre y esa unidad." };
  }
  // 400 de formato ("SKU: Usa solo letras A-Z…", "Codigo para escanear: …").
  if (status === 400 && text.includes("letras a-z")) {
    return text.startsWith("sku") ? { sku: PRODUCT_CODE_MESSAGE } : { qr_code: PRODUCT_CODE_MESSAGE };
  }
  if (status === 403 && (text.includes("descuento") || text.includes("rebaja"))) {
    return { discount_value: withAccents(message) };
  }
  if (status === 404 && text.includes("categoria")) {
    return { category_id: "Esa categoría ya no está disponible. Elige otra." };
  }
  return {};
}

function withAccents(message: string) {
  return message
    .replace("esta habilitado", "está habilitado")
    .replace("esta habilitada", "está habilitada")
    .replace("maximo", "máximo")
    .replace("maxima", "máxima");
}

/** Lo que la API pone si el código queda vacío: "QR-{SKU}" o uno al azar. */
export function automaticCodeHint(sku: string | null) {
  return sku ? `Vacío: se crea uno a partir del SKU (QR-${sku}).` : "Vacío: se crea uno al azar al guardar.";
}

/** Fecha "2026-12-02" como "02/12". */
export function shortDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}/${month}` : isoDate;
}

export const UNIT_SUGGESTIONS = ["unidad", "kg", "g", "litro", "ml", "paquete", "caja", "docena", "bolsa", "botella"];
