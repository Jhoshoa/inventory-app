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
  storefront_enabled: boolean;
  storefront_slug: string | null;
  storefront_tier: string;
  storefront_logo_url: string | null;
  storefront_banner_url: string | null;
  storefront_color_primary: string | null;
  storefront_color_secondary: string | null;
  storefront_description: string | null;
  storefront_whatsapp: string | null;
  storefront_payment_qr_url: string | null;
  storefront_payment_instructions: string | null;
}

export interface StorefrontFormValues {
  enabled: boolean;
  slug: string;
  logoUrl: string;
  bannerUrl: string;
  colorPrimary: string;
  colorSecondary: string;
  description: string;
  whatsapp: string;
  paymentInstructions: string;
}

export type StorefrontState = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};

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
