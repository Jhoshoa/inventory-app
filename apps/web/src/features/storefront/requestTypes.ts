export interface StorefrontRequestFormValues {
  customerName: string;
  customerPhone: string;
  note: string;
  /** Forma de entrega elegida; solo se pregunta si la tienda ofrece las dos. */
  delivery: "pickup" | "delivery" | "";
}

export interface StorefrontOrderLineInput {
  product_id: string;
  quantity: number;
}

export interface StorefrontOrderItem {
  product_id: string | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

/** Respuesta del backend al enviar la boleta: precios y total reales. */
export interface StorefrontOrder {
  id: string;
  items: StorefrontOrderItem[];
  total: string;
  delivery_method: "pickup" | "delivery" | null;
  created_at: string;
}

export type StorefrontOrderState =
  | { ok: true; message: string; order: StorefrontOrder }
  | {
      ok: false;
      message: string;
      fieldErrors: Record<string, string>;
      /** Productos que ya no se pueden pedir (agotados o retirados). */
      unavailableProductIds: string[];
    };
