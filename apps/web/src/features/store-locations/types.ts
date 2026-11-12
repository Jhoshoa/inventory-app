import type { ApiResult } from "@/lib/api/client";

export type ProductLocationKind = "display" | "storage";

export interface StoreLocation {
  id: string;
  zone: string;
  shelf: string | null;
  level: string | null;
  label: string;
  product_count: number;
}

export interface StoreLocationListResponse {
  items: StoreLocation[];
}

/** Donde esta un producto: viene junto al producto (detalle, POS, sync). */
export interface ProductLocation {
  id: string;
  label: string;
  zone: string;
  shelf: string | null;
  level: string | null;
  kind: ProductLocationKind;
}

/** Lo minimo para mostrarla (es lo que guarda el POS sin conexion). */
export type ProductLocationSummary = Pick<ProductLocation, "label" | "kind">;

export interface StoreLocationActionState {
  ok: boolean;
  message?: string;
  location?: StoreLocation;
  fieldErrors: Partial<Record<"zone" | "shelf" | "level", string>>;
}

export type StoreLocationListResult = ApiResult<StoreLocationListResponse>;

export const LOCATION_KIND_LABEL: Record<ProductLocationKind, string> = {
  display: "Exhibición",
  storage: "Depósito",
};

/** Mismo limite que el backend (MAX_LOCATIONS_PER_PRODUCT). */
export const MAX_LOCATIONS_PER_PRODUCT = 6;
export const LOCATION_LIMITS = { zone: 50, shelf: 50, level: 30 } as const;
