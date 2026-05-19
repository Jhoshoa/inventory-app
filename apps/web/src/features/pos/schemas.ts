import type { CartItem, PosCartAction, PosCartState, PosProduct } from "./types";

export const initialCartState: PosCartState = { items: [] };

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

export function validateCheckout(items: CartItem[]) {
  if (items.length === 0) return { items: "Agrega al menos un producto" };

  const invalidItem = items.find(
    (item) => item.quantity <= 0 || item.quantity > item.product.stock,
  );
  if (invalidItem) {
    return { items: `Cantidad invalida para ${invalidItem.product.name}` };
  }

  return {};
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
