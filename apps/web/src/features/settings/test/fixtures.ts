import { DEFAULT_STOREFRONT_SETTINGS } from "@/features/storefront/settings";
import type { StoreResponse } from "../types";

export function makeStore(overrides: Partial<StoreResponse> = {}): StoreResponse {
  return {
    id: "store-1",
    name: "Tienda Local",
    address: "Av. Busch 1240",
    phone: "59171234567",
    is_active: true,
    timezone: "America/La_Paz",
    allow_percentage_discount: true,
    max_percentage_discount: "15.00",
    allow_manual_discount: false,
    max_manual_discount_amount: "0.00",
    allow_cashier_discount_override: true,
    default_alert_days: 5,
    storefront_enabled: true,
    storefront_slug: "tienda-local",
    storefront_tier: "basic",
    storefront_logo_url: null,
    storefront_banner_url: null,
    storefront_color_primary: null,
    storefront_color_secondary: null,
    storefront_description: null,
    storefront_whatsapp: null,
    storefront_payment_qr_url: null,
    storefront_payment_instructions: null,
    storefront_settings: DEFAULT_STOREFRONT_SETTINGS,
    ...overrides,
  };
}
