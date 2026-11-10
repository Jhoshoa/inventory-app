import type { StorefrontSettings } from "./settings";

export interface PublicStorefront {
  name: string;
  tier: string;
  logo_url: string | null;
  banner_url: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  description: string | null;
  whatsapp: string | null;
  payment_qr_url: string | null;
  payment_instructions: string | null;
  timezone: string;
  settings: StorefrontSettings;
}

export interface PublicStorefrontProduct {
  id: string;
  name: string;
  price: string;
  unit: string;
  photo_url: string | null;
  available: boolean;
  low_stock: boolean;
  category: string | null;
  category_id: string | null;
  discount_type: "percentage" | "fixed" | null;
  discount_value: string;
  effective_price: string;
}

export interface PublicStorefrontProductList {
  items: PublicStorefrontProduct[];
  total: number;
  limit: number;
  offset: number;
}

export interface PublicStorefrontFeatured {
  items: PublicStorefrontProduct[];
  /** "manual": los eligio la tienda. "on_sale": productos en oferta. */
  source: "manual" | "on_sale";
}

export interface PublicStorefrontCategory {
  id: string;
  name: string;
  product_count: number;
}
