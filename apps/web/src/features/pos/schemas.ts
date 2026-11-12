import { moneyNumber } from "@/features/products/schemas";
import type { CartItem, PosCartAction, PosCartState, PosProduct } from "./types";

export const initialCartState: PosCartState = { items: [] };
export const PAYMENT_METHODS = ["efectivo", "qr", "transferencia", "tarjeta"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function posCartReducer(state: PosCartState, action: PosCartAction): PosCartState {
  switch (action.type) {
    case "add": {
      if (action.product.stock <= 0) return state;
      const existing = state.items.find((item) => item.product.id === action.product.id);
      if (existing) return incrementItem(state, action.product.id);
      return { items: [...state.items, { product: action.product, quantity: 1 }] };
    }
    case "increment":
      return incrementItem(state, action.productId);
    case "decrement":
      return {
        items: state.items.flatMap((item) => {
          if (item.product.id !== action.productId) return [item];
          const nextQuantity = item.quantity - 1;
          return nextQuantity > 0 ? [{ ...item, quantity: nextQuantity }] : [];
        }),
      };
    case "setQuantity":
      return setItemQuantity(state, action.productId, action.quantity);
    case "syncProducts":
      return syncProducts(state, action.products);
    case "remove":
      return { items: state.items.filter((item) => item.product.id !== action.productId) };
    case "clear":
      return initialCartState;
    case "restore":
      return { items: action.items };
  }
}

export function calculateCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);
}

export type DiscountType = "percentage" | "fixed" | "";
export type DiscountSourceOverride = "auto" | "product" | "manual" | "none" | "";

export function calculateDiscountAmount(subtotal: number, discountType: DiscountType, discountValueRaw: string) {
  // Se escribe como en Bolivia ("2,50"); moneyNumber también acepta punto.
  const value = moneyNumber(discountValueRaw) ?? NaN;
  if (!discountType || !Number.isFinite(value) || value <= 0) return 0;
  if (discountType === "percentage") {
    return Math.min(subtotal * (value / 100), subtotal);
  }
  return Math.min(value, subtotal);
}

/** Suma de los descuentos propios de cada producto en el carrito (Bs.). */
export function calculateProductDiscountTotal(items: CartItem[]) {
  return items.reduce((total, item) => {
    const price = Number(item.product.price);
    const effectivePrice = Number(item.product.effective_price);
    if (!Number.isFinite(price) || !Number.isFinite(effectivePrice)) return total;
    return total + Math.max(price - effectivePrice, 0) * item.quantity;
  }, 0);
}

export function validateCheckout(items: CartItem[], paymentMethod: string = "efectivo") {
  const errors: { items?: string; payment_method?: string } = {};

  if (!isPaymentMethod(paymentMethod)) {
    errors.payment_method = "Elige cómo te pagan";
  }

  if (items.length === 0) {
    errors.items = "Agrega al menos un producto";
    return errors;
  }

  const invalidItem = items.find(
    (item) => item.quantity <= 0 || item.quantity > item.product.stock,
  );
  if (invalidItem) {
    errors.items =
      invalidItem.product.stock <= 0
        ? `${invalidItem.product.name} ya no tiene stock: quítalo de la venta`
        : `${invalidItem.product.name}: quedan ${invalidItem.product.stock} y llevas ${invalidItem.quantity}`;
  }

  return errors;
}

export function serializeCartItems(items: CartItem[]) {
  return JSON.stringify(items);
}

function incrementItem(state: PosCartState, productId: string): PosCartState {
  return {
    items: state.items.map((item) => {
      if (item.product.id !== productId) return item;
      if (item.quantity >= item.product.stock) return item;
      return { ...item, quantity: item.quantity + 1 };
    }),
  };
}

function setItemQuantity(state: PosCartState, productId: string, quantity: number): PosCartState {
  if (!Number.isInteger(quantity) || quantity < 1) return state;

  return {
    items: state.items.map((item) => {
      if (item.product.id !== productId) return item;

      return { ...item, quantity: Math.min(quantity, item.product.stock) };
    }),
  };
}

function syncProducts(state: PosCartState, products: PosProduct[]): PosCartState {
  if (products.length === 0) return state;

  const productsById = new Map(products.map((product) => [product.id, product]));

  return {
    items: state.items.map((item) => ({
      ...item,
      product: productsById.get(item.product.id) ?? item.product,
    })),
  };
}

export function canAddProduct(product: PosProduct) {
  return product.stock > 0;
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

/** Límites de descuento manual de la tienda (Configuración › Precios y descuentos). */
export interface ManualDiscountPolicy {
  allow_percentage_discount: boolean;
  max_percentage_discount: string;
  allow_manual_discount: boolean;
  max_manual_discount_amount: string;
  allow_cashier_discount_override: boolean;
}

/** Descuento manual escrito, contra la política de la tienda (la API lo vuelve a revisar). */
export function validateManualDiscount(type: DiscountType, valueText: string, subtotal: number, policy: ManualDiscountPolicy) {
  if (!type) return null;
  const value = moneyNumber(valueText);
  if (valueText.trim() === "" || value === null) return type === "percentage" ? "Escribe el porcentaje, por ejemplo 10" : "Escribe la rebaja como 2,50";
  if (value <= 0) return "Tiene que ser mayor a 0";
  if (type === "percentage") {
    const max = Number(policy.max_percentage_discount);
    if (!policy.allow_percentage_discount) return "La tienda no permite descuento por porcentaje";
    if (value > max) return `El máximo es ${max}%`;
    return null;
  }
  const max = Number(policy.max_manual_discount_amount);
  if (!policy.allow_manual_discount) return "La tienda no permite rebajas en Bs";
  if (value > max) return `El máximo es Bs ${max.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value > subtotal) return "La rebaja no puede ser mayor que el subtotal";
  return null;
}

/**
 * Qué descuento se aplica, igual que el backend: "auto" toma el más conveniente para el
 * cliente (si empatan, el manual). Solo es una vista previa: la API calcula el total real.
 */
export function resolveDiscount({
  override,
  productDiscountAmount,
  manualDiscountType,
  manualDiscountAmount,
}: {
  override: DiscountSourceOverride;
  productDiscountAmount: number;
  manualDiscountType: DiscountType;
  manualDiscountAmount: number;
}): { amount: number; label: string; source: "product" | "manual" | null } {
  const product = { amount: productDiscountAmount, label: "Descuento de producto", source: "product" as const };
  const manual = { amount: manualDiscountAmount, label: "Descuento manual", source: "manual" as const };
  const none = { amount: 0, label: "", source: null };
  if (override === "product") return productDiscountAmount > 0 ? product : none;
  if (override === "manual") return manualDiscountType && manualDiscountAmount > 0 ? manual : none;
  if (override === "none") return none;
  if (productDiscountAmount > manualDiscountAmount && productDiscountAmount > 0) return product;
  if (manualDiscountAmount > 0) return manual;
  return none;
}

/** Cambio a dar en efectivo; null si no se escribió lo recibido o no es un monto. */
export function changeDue(receivedText: string, total: number): { change: number; missing: number } | null {
  const received = moneyNumber(receivedText);
  if (received === null) return null;
  const difference = Math.round((received - total) * 100) / 100;
  return difference >= 0 ? { change: difference, missing: 0 } : { change: 0, missing: -difference };
}

/** "Justo" y los dos billetes más cercanos por encima del total (tablero A · Cobro). */
export function quickCashAmounts(total: number) {
  const notes = [10, 20, 50, 100, 200];
  const above = notes.filter((note) => note > total).slice(0, 2);
  return { exact: Math.round(total * 100) / 100, notes: above };
}

/** Texto del recibo para WhatsApp (tablero A · Venta lista). */
export function receiptText({
  storeName,
  items,
  total,
  paymentLabel,
  when,
  discount = 0,
}: {
  storeName: string;
  items: { name: string; quantity: number; amount: number }[];
  total: number;
  paymentLabel: string;
  when: string;
  /** Descuento de la venta; si hay, va su línea antes del total. */
  discount?: number;
}) {
  const money = (value: number) => `Bs ${value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lines = items.map((item) => `${item.quantity} × ${item.name} — ${money(item.amount)}`);
  const discountLine = discount > 0 ? [`Descuento: − ${money(discount)}`] : [];
  return [`${storeName}`, when, "", ...lines, "", ...discountLine, `Total: ${money(total)} · ${paymentLabel}`, "¡Gracias por tu compra!"].join("\n");
}
