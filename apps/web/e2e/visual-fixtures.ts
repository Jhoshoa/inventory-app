import { createServer, type Server } from "node:http";

const now = "2026-06-07T14:30:00.000Z";
const businessDate = "2026-06-07";
const businessDayId = "business-day-visual-1";

const categories = [
  {
    id: "cat-grocery",
    name: "Abarrotes",
    sku_prefix: "ABA",
    next_sku_number: 42,
    is_active: true,
  },
  {
    id: "cat-drinks",
    name: "Bebidas frias",
    sku_prefix: "BEB",
    next_sku_number: 18,
    is_active: true,
  },
  {
    id: "cat-cleaning",
    name: "Limpieza del hogar",
    sku_prefix: "LIM",
    next_sku_number: 11,
    is_active: true,
  },
];

const products = [
  {
    id: "prod-rice-1kg",
    name: "Arroz premium grano largo 1kg",
    price: "38.50",
    stock: 18,
    category_id: "cat-grocery",
    category: "Abarrotes",
    qr_code: "750100100001",
    photo_url: null,
    min_stock: 8,
    unit: "unidad",
    sku: "ABA-0042",
    cost_price: "27.20",
    is_active: true,
    version: 3,
  },
  {
    id: "prod-coffee-500g",
    name: "Cafe molido organico bolsa 500g edicion familiar",
    price: "126.90",
    stock: 4,
    category_id: "cat-grocery",
    category: "Abarrotes",
    qr_code: "750100100002",
    photo_url: null,
    min_stock: 6,
    unit: "bolsa",
    sku: "ABA-0043",
    cost_price: "92.10",
    is_active: true,
    version: 2,
  },
  {
    id: "prod-water-600ml",
    name: "Agua mineral 600ml",
    price: "12.00",
    stock: 0,
    category_id: "cat-drinks",
    category: "Bebidas frias",
    qr_code: "750100100003",
    photo_url: null,
    min_stock: 12,
    unit: "botella",
    sku: "BEB-0018",
    cost_price: "7.40",
    is_active: true,
    version: 5,
  },
  {
    id: "prod-cleaner",
    name: "Detergente liquido concentrado lavanda 2L",
    price: "84.75",
    stock: 27,
    category_id: "cat-cleaning",
    category: "Limpieza del hogar",
    qr_code: "750100100004",
    photo_url: null,
    min_stock: 10,
    unit: "unidad",
    sku: "LIM-0011",
    cost_price: "61.00",
    is_active: true,
    version: 1,
  },
];

const sales = [
  {
    id: "sale-visual-0001",
    items: [
      {
        product_id: "prod-rice-1kg",
        product_name: "Arroz premium grano largo 1kg",
        quantity: 2,
        unit_price: "38.50",
        subtotal: "77.00",
      },
      {
        product_id: "prod-coffee-500g",
        product_name: "Cafe molido organico bolsa 500g edicion familiar",
        quantity: 1,
        unit_price: "126.90",
        subtotal: "126.90",
      },
    ],
    total: "203.90",
    payment_method: "cash",
    status: "completed",
    business_day_id: businessDayId,
    business_date: businessDate,
    created_by_user_id: "user-1",
    created_at: "2026-06-07T13:40:00.000Z",
    voided_at: null,
    void_reason: null,
  },
  {
    id: "sale-visual-0002",
    items: [
      {
        product_id: "prod-cleaner",
        product_name: "Detergente liquido concentrado lavanda 2L",
        quantity: 3,
        unit_price: "84.75",
        subtotal: "254.25",
      },
    ],
    total: "254.25",
    payment_method: "qr",
    status: "completed",
    business_day_id: businessDayId,
    business_date: businessDate,
    created_by_user_id: "user-1",
    created_at: "2026-06-07T12:18:00.000Z",
    voided_at: null,
    void_reason: null,
  },
  {
    id: "sale-visual-0003",
    items: [
      {
        product_id: "prod-water-600ml",
        product_name: "Agua mineral 600ml",
        quantity: 6,
        unit_price: "12.00",
        subtotal: "72.00",
      },
    ],
    total: "72.00",
    payment_method: "card",
    status: "voided",
    business_day_id: businessDayId,
    business_date: businessDate,
    created_by_user_id: "user-1",
    created_at: "2026-06-07T11:05:00.000Z",
    voided_at: "2026-06-07T11:20:00.000Z",
    void_reason: "Cliente cambio el metodo de pago",
  },
];

const stockMovements = [
  {
    id: "stock-move-1",
    product_id: "prod-coffee-500g",
    sale_id: "sale-visual-0001",
    movement_type: "sale",
    quantity_delta: -1,
    stock_after: 4,
    reason: "Venta registrada en POS",
    device_id: "pos-main",
    created_at: "2026-06-07T13:40:00.000Z",
  },
  {
    id: "stock-move-2",
    product_id: "prod-water-600ml",
    sale_id: "sale-visual-0003",
    movement_type: "sale_void",
    quantity_delta: 6,
    stock_after: 0,
    reason: "Anulacion de venta",
    device_id: "pos-main",
    created_at: "2026-06-07T11:20:00.000Z",
  },
  {
    id: "stock-move-3",
    product_id: "prod-cleaner",
    sale_id: null,
    movement_type: "manual_adjustment",
    quantity_delta: 12,
    stock_after: 27,
    reason: "Reposicion de anaquel",
    device_id: null,
    created_at: "2026-06-07T10:00:00.000Z",
  },
];

const cashMovements = [
  {
    id: "cash-move-1",
    store_id: "store-1",
    business_day_id: businessDayId,
    movement_type: "cash_in",
    direction: "in",
    amount: "300.00",
    note: "Fondo adicional para cambio",
    created_by_user_id: "user-1",
    occurred_at: "2026-06-07T09:45:00.000Z",
    created_at: "2026-06-07T09:45:00.000Z",
    voided_at: null,
    voided_by_user_id: null,
    void_reason: null,
  },
  {
    id: "cash-move-2",
    store_id: "store-1",
    business_day_id: businessDayId,
    movement_type: "expense",
    direction: "out",
    amount: "85.00",
    note: "Compra de bolsas para empaque",
    created_by_user_id: "user-1",
    occurred_at: "2026-06-07T12:05:00.000Z",
    created_at: "2026-06-07T12:05:00.000Z",
    voided_at: null,
    voided_by_user_id: null,
    void_reason: null,
  },
];

export async function startVisualMockBackend(port = 8001) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);
    const payload = resolvePayload(url);

    if (payload === undefined) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ detail: `No visual fixture for ${url.pathname}` }));
      return;
    }

    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json",
    });
    response.end(JSON.stringify(payload));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    close: () => closeServer(server),
    url: `http://localhost:${port}`,
  };
}

function resolvePayload(url: URL) {
  const path = url.pathname.replace(/^\/api\/v1/, "");

  if (path === "/dashboard/summary") return dashboardSummary();
  if (path === "/store-day/current") return currentStoreDay();
  if (path === "/store-day/current/events") return storeDayEvents();
  if (path === "/store-day/current/closing-preview") return closingPreview();
  if (path === "/store-day/current/close-report") return closeReport();
  if (path === "/product-categories") return { items: categories };
  if (path === "/products") return productList(url);
  if (path === "/products/pos") return productList(url);
  if (path.startsWith("/products/qr/")) return products[0];
  if (path === "/sales") return saleList();
  if (path === "/reports/sales") return salesReport();
  if (path === "/stock-movements") return movementList(stockMovements, url);
  if (path === "/cash-movements") return movementList(cashMovements, url);
  if (path === "/store-day/reports") return closeReportList(url);

  return undefined;
}

function dashboardSummary() {
  return {
    sales_today_total: "530.15",
    sales_today_count: 3,
    products_total: products.length,
    low_stock_count: 2,
    out_of_stock_count: 1,
    latest_sales: sales,
    low_stock_products: products
      .filter((product) => product.stock <= product.min_stock)
      .map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        min_stock: product.min_stock,
      })),
    exchange_rates: [
      { id: "rate-bcv", source: "BCV", buy_price: "36.45", sell_price: "36.95" },
      { id: "rate-store", source: "Tienda", buy_price: "36.30", sell_price: "37.10" },
    ],
    scope: "today",
    from_date: businessDate,
    to_date: businessDate,
    timezone: "America/La_Paz",
    first_business_date: "2026-06-01",
  };
}

function currentStoreDay() {
  return {
    id: businessDayId,
    status: "open",
    business_date: businessDate,
    opened_at: "2026-06-07T09:00:00.000Z",
    closed_at: null,
    opened_by_user_id: "user-1",
    closed_by_user_id: null,
    opening_note: "Apertura visual baseline",
    closing_note: null,
    opening_cash_amount: "500.00",
    expected_cash_amount: "918.90",
    counted_cash_amount: null,
    cash_difference_amount: null,
    closing_sales_total: null,
    closing_sales_count: null,
    closing_voided_sales_count: null,
    closing_items_count: null,
    closing_cash_sales_total: null,
    closing_qr_sales_total: null,
    closing_transfer_sales_total: null,
    closing_card_sales_total: null,
    closing_cash_movements_in_total: null,
    closing_cash_movements_out_total: null,
    closing_cash_movements_count: null,
    closing_snapshot_at: null,
    sales_total: "530.15",
    sales_count: 3,
    voided_sales_count: 1,
    timezone: "America/La_Paz",
    first_business_date: "2026-06-01",
  };
}

function storeDayEvents() {
  return [
    {
      id: "event-open-1",
      business_day_id: businessDayId,
      store_id: "store-1",
      event_type: "open",
      note: "Apertura con caja inicial verificada",
      created_by_user_id: "user-1",
      created_at: "2026-06-07T09:00:00.000Z",
    },
  ];
}

function closingPreview() {
  return {
    business_day_id: businessDayId,
    business_date: businessDate,
    status: "open",
    opening_cash_amount: "500.00",
    sales_total: "530.15",
    sales_count: 3,
    voided_sales_count: 1,
    items_count: 12,
    cash_sales_total: "203.90",
    qr_sales_total: "254.25",
    transfer_sales_total: "0.00",
    card_sales_total: "72.00",
    cash_movements_in_total: "300.00",
    cash_movements_out_total: "85.00",
    cash_movements_count: 2,
    expected_cash_amount: "918.90",
  };
}

function closeReport() {
  return {
    ...closingPreview(),
    status: "closed",
    closed_at: now,
    closed_by_user_id: "user-1",
    counted_cash_amount: "920.00",
    cash_difference_amount: "1.10",
    closing_note: "Cierre visual baseline",
    closing_snapshot_at: now,
  };
}

function productList(url: URL) {
  const query = url.searchParams.get("q")?.toLowerCase();
  const filtered = query
    ? products.filter((product) =>
        [product.name, product.sku, product.qr_code].some((value) => value?.toLowerCase().includes(query)),
      )
    : products;

  return {
    items: filtered,
    total: filtered.length,
    limit: Number(url.searchParams.get("limit") ?? 25),
    offset: Number(url.searchParams.get("offset") ?? 0),
  };
}

function saleList() {
  return {
    items: sales,
    total: sales.length,
    limit: 25,
    offset: 0,
    from_date: businessDate,
    to_date: businessDate,
    timezone: "America/La_Paz",
    first_business_date: "2026-06-01",
  };
}

function salesReport() {
  return {
    from_date: businessDate,
    to_date: businessDate,
    total_sales: "530.15",
    sales_count: 3,
    items_count: 12,
    by_payment_method: [
      { payment_method: "cash", total: "203.90", count: 1 },
      { payment_method: "qr", total: "254.25", count: 1 },
      { payment_method: "card", total: "72.00", count: 1 },
    ],
    top_products: [
      { product_id: "prod-cleaner", product_name: "Detergente liquido concentrado lavanda 2L", quantity: 3, total: "254.25" },
      { product_id: "prod-rice-1kg", product_name: "Arroz premium grano largo 1kg", quantity: 2, total: "77.00" },
      { product_id: "prod-water-600ml", product_name: "Agua mineral 600ml", quantity: 6, total: "72.00" },
    ],
  };
}

function movementList<T>(items: T[], url: URL) {
  return {
    items,
    total: items.length,
    limit: Number(url.searchParams.get("limit") ?? 25),
    offset: Number(url.searchParams.get("offset") ?? 0),
    from_date: businessDate,
    to_date: businessDate,
  };
}

function closeReportList(url: URL) {
  const report = closeReport();
  return {
    items: [report],
    total: 1,
    limit: Number(url.searchParams.get("limit") ?? 25),
    offset: Number(url.searchParams.get("offset") ?? 0),
    from_date: businessDate,
    to_date: businessDate,
  };
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
