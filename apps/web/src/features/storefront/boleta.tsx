"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PublicStorefrontProduct } from "./types";

/** Lo mismo que limita el backend (CreateStorefrontOrderDTO). */
export const MAX_BOLETA_LINES = 30;
export const MAX_LINE_QUANTITY = 999;

export interface BoletaLine {
  productId: string;
  name: string;
  unit: string;
  /** Precio que vio el cliente. Solo para mostrar: el total real lo calcula el backend. */
  unitPrice: string;
  photoUrl: string | null;
  quantity: number;
  /** Marcado cuando el backend dice que ya no esta disponible. */
  unavailable?: boolean;
}

interface BoletaContextValue {
  lines: BoletaLine[];
  itemCount: number;
  total: number;
  add: (product: PublicStorefrontProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  /** Suma uno a un producto que ya esta en la boleta. */
  increment: (productId: string) => void;
  /** Resta uno; en cero lo quita de la boleta. */
  decrement: (productId: string) => void;
  markUnavailable: (productIds: string[]) => void;
  clear: () => void;
  quantityOf: (productId: string) => number;
}

const BoletaContext = createContext<BoletaContextValue | null>(null);

function storageKey(slug: string) {
  return `tiendamiga:boleta:${slug}`;
}

function readStored(slug: string): BoletaLine[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is BoletaLine =>
          typeof line?.productId === "string" &&
          typeof line?.name === "string" &&
          typeof line?.unitPrice === "string" &&
          Number.isInteger(line?.quantity) &&
          line.quantity > 0,
      )
      .slice(0, MAX_BOLETA_LINES)
      .map((line) => ({ ...line, quantity: Math.min(line.quantity, MAX_LINE_QUANTITY), unavailable: false }));
  } catch {
    return [];
  }
}

/** La boleta del cliente en un catalogo. Vive en el navegador (por tienda) hasta que la envia. */
export function StorefrontBoletaProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [lines, setLines] = useState<BoletaLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLines(readStored(slug));
    setLoaded(true);
  }, [slug]);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (lines.length === 0) window.localStorage.removeItem(storageKey(slug));
      else window.localStorage.setItem(storageKey(slug), JSON.stringify(lines));
    } catch {
      // Sin almacenamiento (modo privado): la boleta dura lo que la pestana.
    }
  }, [lines, loaded, slug]);

  const add = useCallback((product: PublicStorefrontProduct, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: Math.min(line.quantity + quantity, MAX_LINE_QUANTITY), unavailable: false }
            : line,
        );
      }
      if (current.length >= MAX_BOLETA_LINES) return current;
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          unitPrice: product.effective_price,
          photoUrl: product.photo_url,
          quantity: Math.min(quantity, MAX_LINE_QUANTITY),
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.max(1, Math.min(quantity, MAX_LINE_QUANTITY)) }
          : line,
      ),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const increment = useCallback((productId: string) => {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY) } : line,
      ),
    );
  }, []);

  const decrement = useCallback((productId: string) => {
    setLines((current) =>
      current.flatMap((line) =>
        line.productId !== productId ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [],
      ),
    );
  }, []);

  const markUnavailable = useCallback((productIds: string[]) => {
    const ids = new Set(productIds);
    setLines((current) => current.map((line) => (ids.has(line.productId) ? { ...line, unavailable: true } : line)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<BoletaContextValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
    return {
      lines,
      itemCount,
      total,
      add,
      setQuantity,
      remove,
      increment,
      decrement,
      markUnavailable,
      clear,
      quantityOf: (productId) => lines.find((line) => line.productId === productId)?.quantity ?? 0,
    };
  }, [lines, add, setQuantity, remove, increment, decrement, markUnavailable, clear]);

  return <BoletaContext.Provider value={value}>{children}</BoletaContext.Provider>;
}

export function useBoleta(): BoletaContextValue {
  const value = useContext(BoletaContext);
  if (!value) throw new Error("useBoleta necesita StorefrontBoletaProvider");
  return value;
}
