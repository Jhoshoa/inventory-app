export interface StoreResponse {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  allow_percentage_discount: boolean;
  max_percentage_discount: string;
  allow_manual_discount: boolean;
  max_manual_discount_amount: string;
  allow_cashier_discount_override: boolean;
}

export interface StoreFormValues {
  name: string;
  address: string;
  phone: string;
}

export interface DiscountPolicyFormValues {
  allowPercentageDiscount: boolean;
  maxPercentageDiscount: string;
  allowManualDiscount: boolean;
  maxManualDiscountAmount: string;
  allowCashierDiscountOverride: boolean;
}

export type DiscountPolicyState = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};

export type StoreEditorState = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};

export type CheckoutState =
  | { ok: true; storeName: string; billingNit: string | null; subscriptionStatus: string }
  | { ok: false; message: string };
