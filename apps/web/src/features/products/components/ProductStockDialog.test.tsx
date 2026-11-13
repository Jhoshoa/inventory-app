import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adjustStockAction } from "../actions";
import type { ProductBatch } from "../types";
import { ProductStockDialog } from "./ProductStockDialog";

const refresh = vi.fn();
vi.mock("../actions", () => ({ adjustStockAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

function lot(overrides: Partial<ProductBatch>): ProductBatch {
  return {
    id: "b-1",
    product_id: "p-1",
    expires_on: "2026-11-13",
    alert_days: 5,
    quantity_initial: 8,
    quantity_remaining: 8,
    created_at: "",
    days_left: 1,
    status: "expiring",
    product_name: null,
    product_unit: null,
    ...overrides,
  };
}

const lots = [lot({}), lot({ id: "b-2", expires_on: "2026-12-20", quantity_remaining: 3, status: "ok", days_left: 38 })];

function open(props: Partial<Parameters<typeof ProductStockDialog>[0]> = {}) {
  render(
    <ProductStockDialog productId="p-1" productName="Yogur Frutilla" currentStock={11} batches={lots} defaultAlertDays={7} {...props} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ajustar stock" }));
  return screen.getByRole("dialog", { name: "Ajustar stock" });
}

describe("ProductStockDialog", () => {
  beforeEach(() => {
    vi.mocked(adjustStockAction).mockReset();
    refresh.mockReset();
  });

  it("adds units with a lot and shows the stock after", async () => {
    vi.mocked(adjustStockAction).mockResolvedValue({ ok: true, fieldErrors: {} });
    const dialog = open();
    expect(within(dialog).getByText("Yogur Frutilla · hay 11 u.")).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: "Agregar" })).toBeChecked();
    expect(within(dialog).getByLabelText("Cantidad que entra")).toHaveFocus();

    fireEvent.change(within(dialog).getByLabelText("Cantidad que entra"), { target: { value: "6" } });
    expect(within(dialog).getByText("11 → 17 u.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Vence el/), { target: { value: "2026-12-02" } });
    expect(within(dialog).getByLabelText("Avisar días antes")).toHaveAttribute("placeholder", "7");
    expect(within(dialog).getByText(/vence el 02\/12\. Vacío el aviso: 7 días/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar 6 unidades" }));
    await waitFor(() => expect(adjustStockAction).toHaveBeenCalled());
    const formData = vi.mocked(adjustStockAction).mock.calls[0][1];
    expect(formData.get("quantity")).toBe("6");
    expect(formData.get("expires_on")).toBe("2026-12-02");
    expect(formData.get("alert_days")).toBe("");
    expect(formData.get("batch_id")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalled();
  });

  it("the stepper adds and removes one", () => {
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: "Uno más" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Uno más" }));
    expect(within(dialog).getByLabelText("Cantidad que entra")).toHaveValue("2");
    fireEvent.click(within(dialog).getByRole("button", { name: "Uno menos" }));
    expect(within(dialog).getByLabelText("Cantidad que entra")).toHaveValue("1");
    expect(within(dialog).getByRole("button", { name: "Uno menos" })).toBeDisabled();
  });

  it("deducting sends a negative quantity, from the chosen lot, with a reason", async () => {
    vi.mocked(adjustStockAction).mockResolvedValue({ ok: true, fieldErrors: {} });
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Descontar" }));
    fireEvent.change(within(dialog).getByLabelText("Cantidad que sale"), { target: { value: "2" } });
    expect(within(dialog).getByText("11 → 9 u.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("radio", { name: /Lote 20\/12 · quedan 3/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Roto o dañado" }));
    expect(within(dialog).getByLabelText("Razón")).toHaveValue("Roto o dañado");

    fireEvent.click(within(dialog).getByRole("button", { name: "Descontar 2 unidades" }));
    await waitFor(() => expect(adjustStockAction).toHaveBeenCalled());
    const formData = vi.mocked(adjustStockAction).mock.calls[0][1];
    expect(formData.get("quantity")).toBe("-2");
    expect(formData.get("batch_id")).toBe("b-2");
    expect(formData.get("reason")).toBe("Roto o dañado");
  });

  it("warns at once when deducting more than the lot or the stock", () => {
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Descontar" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: /Lote 20\/12/ }));
    fireEvent.change(within(dialog).getByLabelText("Cantidad que sale"), { target: { value: "4" } });
    expect(within(dialog).getByText("Ese lote solo tiene 3 unidades.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Descontar 4 unidades" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("radio", { name: /Automático/ }));
    fireEvent.change(within(dialog).getByLabelText("Cantidad que sale"), { target: { value: "12" } });
    expect(within(dialog).getByText("Stock insuficiente: hay 11")).toBeInTheDocument();
  });

  it("asks for the reason when deducting", () => {
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Descontar" }));
    fireEvent.change(within(dialog).getByLabelText("Cantidad que sale"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Descontar 1 unidad" }));
    expect(within(dialog).getByText("Escribe la razón (por ejemplo: Roto o dañado)")).toBeInTheDocument();
    expect(adjustStockAction).not.toHaveBeenCalled();
  });

  it("Retirar opens Descontar with that lot and its units", () => {
    render(
      <ProductStockDialog
        productId="p-1"
        productName="Yogur Frutilla"
        currentStock={11}
        batches={lots}
        trigger="none"
        open
        preset={{ quantity: -8, batchId: "b-1", reason: "Vencido" }}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Ajustar stock" });
    expect(within(dialog).getByRole("radio", { name: "Descontar" })).toBeChecked();
    expect(within(dialog).getByLabelText("Cantidad que sale")).toHaveValue("8");
    expect(within(dialog).getByRole("radio", { name: /Lote 13\/11 · quedan 8/ })).toBeChecked();
    expect(within(dialog).getByLabelText("Razón")).toHaveValue("Vencido");
    expect(within(dialog).getByRole("button", { name: "Descontar 8 unidades" })).toBeEnabled();
  });

  it("shows API errors on the field", async () => {
    vi.mocked(adjustStockAction).mockResolvedValue({ ok: false, fieldErrors: { quantity: "Stock insuficiente: hay 10" } });
    const dialog = open();
    fireEvent.change(within(dialog).getByLabelText("Cantidad que entra"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar 1 unidad" }));
    expect(await within(dialog).findByText("Stock insuficiente: hay 10")).toBeInTheDocument();
  });
});
