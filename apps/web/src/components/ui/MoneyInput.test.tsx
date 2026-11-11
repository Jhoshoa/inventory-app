import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoneyInput, sanitizeMoneyText } from "./MoneyInput";

describe("sanitizeMoneyText", () => {
  it.each([
    ["30,50", "30,50"],
    ["30.50", "30.50"],
    ["Bs 15", "15"],
    ["-5", "5"],
    ["abc12.3x4", "12.34"],
    // No se "corrige" en silencio: la validación avisa.
    ["30,505", "30,505"],
    ["1.234,50", "1.234,50"],
    ["", ""],
  ])("%s → %s", (input, expected) => {
    expect(sanitizeMoneyText(input)).toBe(expected);
  });
});

describe("MoneyInput", () => {
  it("keeps the comma while typing", () => {
    render(<MoneyInput aria-label="Monto" />);
    const input = screen.getByLabelText("Monto") as HTMLInputElement;
    expect(input).toHaveAttribute("inputmode", "decimal");
    fireEvent.input(input, { target: { value: "30,5" } });
    expect(input.value).toBe("30,5");
    fireEvent.input(input, { target: { value: "30,5x0" } });
    expect(input.value).toBe("30,50");
    fireEvent.input(input, { target: { value: "1".repeat(30) } });
    expect(input.value).toHaveLength(16);
  });
});
