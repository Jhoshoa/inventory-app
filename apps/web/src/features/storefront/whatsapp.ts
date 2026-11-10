export function storefrontWhatsappHref(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const DELIVERY_LABELS = { pickup: "Recojo en tienda", delivery: "Envio a domicilio" } as const;

/** Mensaje con el detalle de la boleta ya registrada (precios del backend). */
export function boletaWhatsappMessage({
  storeName,
  customerName,
  order,
  formatPrice,
}: {
  storeName: string;
  customerName: string;
  order: {
    items: Array<{ product_name: string; quantity: number; unit: string; line_total: string }>;
    total: string;
    delivery_method: "pickup" | "delivery" | null;
  };
  formatPrice: (value: string) => string;
}): string {
  const lines = order.items.map(
    (item) => `• ${item.quantity} ${item.unit} x ${item.product_name} — ${formatPrice(item.line_total)}`,
  );
  return [
    `Hola ${storeName}, soy ${customerName}. Te envio mi pedido:`,
    "",
    ...lines,
    "",
    `Total: ${formatPrice(order.total)}`,
    ...(order.delivery_method ? [`Entrega: ${DELIVERY_LABELS[order.delivery_method]}`] : []),
  ].join("\n");
}
