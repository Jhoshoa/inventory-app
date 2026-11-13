import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeSale } from "../test/fixtures";
import { SaleDetail } from "./SaleDetail";

vi.mock("../actions", () => ({ voidSaleAction: vi.fn() }));

const store = { name: "Tienda Local", address: "Av. Busch 1240", phone: null };

describe("SaleDetail", () => {
  it("shows products, totals, who sold it and how it was registered", () => {
    render(<SaleDetail sale={makeSale()} role="owner" store={store} today="2026-11-10" />);

    expect(screen.getByRole("heading", { name: "Venta b07038f2" })).toBeInTheDocument();
    expect(screen.getByText("Hoy 11:47 · Luis")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();
    const products = screen.getByRole("region", { name: "Productos" });
    expect(within(products).getByText("Coca Cola 2l")).toBeInTheDocument();
    expect(within(products).getByText("Descuento de producto")).toBeInTheDocument();
    const facts = screen.getByRole("region", { name: "Datos de la venta" });
    expect(within(facts).getByText("Efectivo")).toBeInTheDocument();
    expect(within(facts).getByText("En línea")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Imprimir/ })).toHaveAttribute("href", `/dashboard/sales/${makeSale().id}/print`);
    expect(screen.getByRole("link", { name: /WhatsApp/ }).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it("lets only the owner void a completed sale", () => {
    const { rerender } = render(<SaleDetail sale={makeSale()} role="cashier" store={store} today="2026-11-10" />);
    expect(screen.queryByRole("button", { name: "Anular venta" })).not.toBeInTheDocument();

    rerender(<SaleDetail sale={makeSale()} role="owner" store={store} today="2026-11-10" />);
    expect(screen.getByRole("button", { name: "Anular venta" })).toBeInTheDocument();
  });

  it("shows who voided it and why, without the void button", () => {
    render(
      <SaleDetail
        sale={makeSale({ status: "voided", voided_at: "2026-11-10T16:05:00Z", void_reason: "Error al cobrar", voided_by_name: "Rosa" })}
        role="owner"
        store={store}
        today="2026-11-10"
      />,
    );
    expect(screen.getByText("Anulada hoy 12:05 por Rosa")).toBeInTheDocument();
    expect(screen.getByText("Razón: Error al cobrar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular venta" })).not.toBeInTheDocument();
  });

  it("opens the receipt ticket", async () => {
    const user = userEvent.setup();
    render(<SaleDetail sale={makeSale()} role="cashier" store={store} today="2026-11-10" />);

    await user.click(screen.getByRole("button", { name: "Recibo" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Tienda Local")).toBeInTheDocument();
    expect(within(dialog).getByText("TOTAL Bs")).toBeInTheDocument();
    expect(within(dialog).getByText("46,20")).toBeInTheDocument();
    expect(within(dialog).getByText("Comprobante de venta · no es factura")).toBeInTheDocument();
  });
});
