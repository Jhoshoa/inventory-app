import { formatCurrency } from "@/lib/format/currency";
import { formatTimeShort } from "@/lib/format/datetime";
import { businessDateKey, shiftDate } from "@/features/sales/list";
import type { PosOrder } from "@/features/pos/order";
import type { StorefrontRequestListResponse, StorefrontRequestResponse, StorefrontRequestStatus } from "./types";

// Pedidos del catálogo (tablero P07): pestañas, textos y el mensaje de WhatsApp.

export type OrderTab = StorefrontRequestStatus | "all";

export const ORDER_TABS: { value: OrderTab; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "contacted", label: "Contactados" },
  { value: "closed", label: "Cerrados" },
  { value: "all", label: "Todos" },
];

export const STATUS_LABEL: Record<StorefrontRequestStatus, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  closed: "Cerrado",
};

export const STATUS_ORDER: StorefrontRequestStatus[] = ["pending", "contacted", "closed"];

export const DELIVERY_LABEL = { pickup: "Recojo en tienda", delivery: "Envío a domicilio" } as const;
export const DELIVERY_SHORT = { pickup: "Recojo", delivery: "Envío" } as const;

export function parseOrderTab(value: string | string[] | undefined): OrderTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return ORDER_TABS.some((tab) => tab.value === raw) ? (raw as OrderTab) : "pending";
}

export type StatusCounts = Record<StorefrontRequestStatus, number>;

/** Conteo por estado (B7); si la API no lo trae, solo se sabe el de pendientes. */
export function statusCounts(data: Pick<StorefrontRequestListResponse, "status_counts" | "pending_count">): StatusCounts | null {
  const counts = data.status_counts;
  if (!counts) return null;
  return { pending: counts.pending ?? data.pending_count, contacted: counts.contacted ?? 0, closed: counts.closed ?? 0 };
}

/** Los conteos después de mover un pedido de estado (sin volver a pedirlos). */
export function moveCount(counts: StatusCounts | null, from: StorefrontRequestStatus, to: StorefrontRequestStatus) {
  if (!counts || from === to) return counts;
  return { ...counts, [from]: Math.max(counts[from] - 1, 0), [to]: counts[to] + 1 };
}

/** "3 productos" o, en pedidos viejos de un producto, su nombre. */
export function orderSummary(request: StorefrontRequestResponse) {
  if (request.items.length === 0) return request.product_name;
  if (request.items.length === 1) return request.items[0].product_name;
  return `${request.items.length} productos`;
}

/** "3 productos · Envío a domicilio". */
export function orderLine(request: StorefrontRequestResponse) {
  const parts = [request.items.length > 1 ? `${request.items.length} productos` : request.items.length === 1 ? "1 producto" : request.product_name];
  if (request.delivery_method) parts.push(DELIVERY_LABEL[request.delivery_method]);
  return parts.join(" · ");
}

/** "hace 25 min", "hace 2 h", "ayer 18:10" o "10/11 09:30". */
export function relativeTime(createdAt: string, now: number) {
  const minutes = Math.floor((now - Date.parse(createdAt)) / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const today = businessDateKey(new Date(now));
  const day = businessDateKey(createdAt);
  if (day === today) return `hace ${Math.floor(minutes / 60)} h`;
  if (day === shiftDate(today, -1)) return `ayer ${formatTimeShort(createdAt)}`;
  const [, month, date] = day.split("-");
  return `${date}/${month} ${formatTimeShort(createdAt)}`;
}

/** "hoy 11:22" o "10/11 11:22" para el detalle. */
export function receivedAt(createdAt: string, now: number) {
  const day = businessDateKey(createdAt);
  if (day === businessDateKey(new Date(now))) return `hoy ${formatTimeShort(createdAt)}`;
  const [, month, date] = day.split("-");
  return `${date}/${month} ${formatTimeShort(createdAt)}`;
}

/** Mensaje armado con el pedido para escribirle al cliente. */
export function customerWhatsappMessage(request: StorefrontRequestResponse, storeName: string) {
  const from = storeName ? ` de ${storeName}` : "";
  if (request.items.length === 0) {
    return `Hola ${request.customer_name}, te escribo${from} por tu consulta de "${request.product_name}".`;
  }
  const lines = request.items.map((item) => `• ${item.quantity} × ${item.product_name} — ${formatCurrency(item.line_total)}`);
  return [
    `Hola ${request.customer_name}, te escribo${from} por tu pedido:`,
    "",
    ...lines,
    ...(request.total ? ["", `Total: ${formatCurrency(request.total)}`] : []),
    ...(request.delivery_method ? [DELIVERY_LABEL[request.delivery_method]] : []),
  ].join("\n");
}

/** Lo que Vender necesita para cobrar el pedido (los pedidos viejos traen un solo producto). */
export function toPosOrder(request: StorefrontRequestResponse): PosOrder {
  const items =
    request.items.length > 0
      ? request.items.map((item) => ({ productId: item.product_id, name: item.product_name, quantity: item.quantity }))
      : [{ productId: request.product_id, name: request.product_name, quantity: 1 }];
  return { id: request.id, customerName: request.customer_name, items };
}

export function catalogUrl(slug: string, origin: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/+$/, "");
  return `${base}/t/${slug}`;
}
