export interface StorefrontRequestFormValues {
  customerName: string;
  customerPhone: string;
  note: string;
}

export type StorefrontRequestState =
  | { ok: true; message: string; fieldErrors: Record<string, string> }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export const INITIAL_STOREFRONT_REQUEST_STATE: StorefrontRequestState = {
  ok: false,
  message: "",
  fieldErrors: {},
};
