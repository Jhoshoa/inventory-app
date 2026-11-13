import { forwardRef } from "react";
import type { FormEvent } from "react";
import { MAX_MONEY_INTEGER_DIGITS } from "@/lib/format/currency";
import { Input, type InputProps } from "./Input";

/**
 * Deja escribir un monto como en Bolivia: "30,50" o "30.50". Solo quita lo que
 * no es número ni separador. No recorta decimales ni separadores: si alguien
 * escribe "1.234,50" la validación se lo explica en vez de convertirlo en 1,23
 * sin avisar. El valor se normaliza al enviar con parseMoney (lib/format/currency).
 */
export function sanitizeMoneyText(value: string) {
  return value.replace(/[^\d.,]/g, "").slice(0, MAX_MONEY_INPUT_LENGTH);
}

// 10 dígitos enteros + separador + 2 decimales, con margen para que se vea el error.
const MAX_MONEY_INPUT_LENGTH = MAX_MONEY_INTEGER_DIGITS + 6;

function onMoneyInput(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const sanitized = sanitizeMoneyText(input.value);
  if (input.value !== sanitized) input.value = sanitized;
}

export const MoneyInput = forwardRef<HTMLInputElement, Omit<InputProps, "type" | "inputMode">>(function MoneyInput(
  { onInput, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      onInput={(event) => {
        onMoneyInput(event);
        onInput?.(event);
      }}
      {...props}
    />
  );
});
