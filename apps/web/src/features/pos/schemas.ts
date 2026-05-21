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
    case "remove":
      return { items: state.items.filter((item) => item.product.id !== action.productId) };
    case "clear":
      return initialCartState;
  }
}

export function calculateCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);
}

export function validateCheckout(items: CartItem[], paymentMethod: string = "efectivo") {
  const errors: { items?: string; payment_method?: string } = {};

  if (!isPaymentMethod(paymentMethod)) {
    errors.payment_method = "Metodo de pago invalido";
  }

  if (items.length === 0) {
    errors.items = "Agrega al menos un producto";
    return errors;
  }

  const invalidItem = items.find(
    (item) => item.quantity <= 0 || item.quantity > item.product.stock,
  );
  if (invalidItem) {
    errors.items = `Cantidad invalida para ${invalidItem.product.name}`;
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

export function canAddProduct(product: PosProduct) {
  return product.stock > 0;
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}
