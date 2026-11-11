export const initialState: {
  ok: boolean;
  message?: string;
  storeDay?: import("../types").StoreDay;
  fieldErrors: Record<string, string>;
} = {
  ok: false,
  fieldErrors: {},
};

export function cashMovementLabel(type: string) {
  const labels: Record<string, string> = {
    cash_in: "Entrada",
    cash_out: "Salida",
    expense: "Gasto",
    deposit: "Depósito al banco",
    withdrawal: "Retiro",
  };
  return labels[type] ?? type;
}

// Montos: usar MoneyInput (components/ui), que deja escribir coma o punto.
export { sanitizeMoneyText as toMoneyInputValue } from "@/components/ui/MoneyInput";
