"use client";

import { useReducer } from "react";
import { PosCart } from "./PosCart";
import { PosCheckoutPanel } from "./PosCheckoutPanel";
import { PosProductSearch } from "./PosProductSearch";
import { initialCartState, posCartReducer } from "../schemas";

export function PosWorkspace() {
  const [cart, dispatch] = useReducer(posCartReducer, initialCartState);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <PosProductSearch onAdd={(product) => dispatch({ type: "add", product })} />
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <PosCart
          items={cart.items}
          onIncrement={(productId) => dispatch({ type: "increment", productId })}
          onDecrement={(productId) => dispatch({ type: "decrement", productId })}
          onQuantityChange={(productId, quantity) => dispatch({ type: "setQuantity", productId, quantity })}
          onRemove={(productId) => dispatch({ type: "remove", productId })}
        />
        <PosCheckoutPanel items={cart.items} />
      </aside>
    </div>
  );
}
