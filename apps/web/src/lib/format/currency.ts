const currencyFormatter = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}
