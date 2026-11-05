export interface StorefrontRequestFormValues {
  customerName: string;
  customerPhone: string;
  note: string;
  /** Forma de entrega elegida; solo se pregunta si la tienda ofrece las dos. */
  delivery: "pickup" | "delivery" | "";
}

export type StorefrontRequestState =
  | { ok: true; message: string; fieldErrors: Record<string, string> }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export const INITIAL_STOREFRONT_REQUEST_STATE: StorefrontRequestState = {
  ok: false,
  message: "",
  fieldErrors: {},
};
