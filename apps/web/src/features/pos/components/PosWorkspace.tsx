"use client";

import { useCallback, useReducer, useRef, useState } from "react";
import { PosCart } from "./PosCart";
import { PosCheckoutPanel } from "./PosCheckoutPanel";
import { PosProductSearch, type PosProductSearchHandle } from "./PosProductSearch";
import { initialCartState, posCartReducer } from "../schemas";
import type { CheckoutActionState, PosProduct } from "../types";

export function PosWorkspace() {
  const [cart, dispatch] = useReducer(posCartReducer, initialCartState);
  const [lastAddedProductName, setLastAddedProductName] = useState<string | null>(null);
  const searchRef = useRef<PosProductSearchHandle>(null);

  const handleAddProduct = useCallback((product: PosProduct) => {
    dispatch({ type: "add", product });
    setLastAddedProductName(product.name);
    searchRef.current?.clear();
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  const handleStockRefresh = useCallback((state: CheckoutActionState) => {
    if (state.refreshedProducts?.length) {
      dispatch({ type: "syncProducts", products: state.refreshedProducts });
    }
  }, []);

  const handleIncrement = useCallback(
    (productId: string) => dispatch({ type: "increment", productId }),
    [],
  );
  const handleDecrement = useCallback(
    (productId: string) => dispatch({ type: "decrement", productId }),
    [],
  );
  const handleQuantityChange = useCallback(
    (productId: string, quantity: number) => dispatch({ type: "setQuantity", productId, quantity }),
    [],
  );
  const handleRemove = useCallback(
    (productId: string) => dispatch({ type: "remove", productId }),
    [],
  );

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <PosProductSearch
        ref={searchRef}
        lastAddedProductName={lastAddedProductName}
        onAdd={handleAddProduct}
      />
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <PosCart
          items={cart.items}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
        />
        <PosCheckoutPanel items={cart.items} onStockRefresh={handleStockRefresh} />
      </aside>
    </div>
  );
}
