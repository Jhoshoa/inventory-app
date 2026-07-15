import type { FormEvent } from "react";

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
    deposit: "Deposito",
    withdrawal: "Retiro",
  };
  return labels[type] ?? type;
}

export function sanitizeMoneyInput(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const sanitized = toMoneyInputValue(input.value);
  if (input.value !== sanitized) input.value = sanitized;
}

export function toMoneyInputValue(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integer = "", ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return integer;
  return `${integer}.${decimalParts.join("").slice(0, 2)}`;
}
