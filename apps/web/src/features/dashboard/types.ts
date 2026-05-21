import type { ApiResult } from "@/lib/api/client";

export interface DashboardSummary {
  sales_today_total: string;
  sales_today_count: number;
  products_total: number;
  low_stock_count: number;
  out_of_stock_count: number;
  latest_sales: DashboardSale[];
  low_stock_products: DashboardProduct[];
  exchange_rates: DashboardExchangeRate[];
}

export interface DashboardSale {
  id: string;
  items?: DashboardSaleItem[];
  total: string;
  payment_method?: string | null;
  status?: string;
  created_at?: string;
}

export interface DashboardSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price?: string;
  subtotal?: string;
}

export interface DashboardProduct {
  id: string;
  name: string;
  stock: number;
  min_stock?: number;
}

export interface DashboardExchangeRate {
  id: string;
  source: string;
  buy_price?: string | null;
  sell_price?: string | null;
}

export type DashboardSummaryResult = ApiResult<DashboardSummary>;
