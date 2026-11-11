import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { adjustStockAction } from "../actions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductStockDialog } from "./ProductStockDialog";
import type { ProductBatch } from "../types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("../actions", () => ({
  adjustStockAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe("ProductStockDialog", () => {
  beforeEach(() => {
    vi.mocked(adjustStockAction).mockReset();
    mocks.refresh.mockClear();
  });

  it("shows the current stock when opened", async () => {
    const user = userEvent.setup();
    render(<ProductStockDialog productId="product-1" productName="Arroz" currentStock={12} />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));

    expect(screen.getByText(/Stock actual:/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("previews the resulting stock as the user types a quantity", async () => {
    const user = userEvent.setup();
    render(<ProductStockDialog productId="product-1" productName="Arroz" currentStock={12} />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.type(screen.getByLabelText("Cantidad a ajustar"), "-5");

    expect(screen.getByText(/Stock resultante: 7 unidades/)).toBeInTheDocument();
  });

  it("flags an insufficient resulting stock in the live preview", async () => {
    const user = userEvent.setup();
    render(<ProductStockDialog productId="product-1" productName="Arroz" currentStock={3} />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.type(screen.getByLabelText("Cantidad a ajustar"), "-10");

    expect(screen.getByText(/insuficiente/)).toBeInTheDocument();
  });

  it("marks the reason as required only when deducting stock", async () => {
    const user = userEvent.setup();
    render(<ProductStockDialog productId="product-1" productName="Arroz" currentStock={12} />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    expect(screen.getByText("Razon (opcional)")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Cantidad a ajustar/), "-1");
    expect(screen.getByText(/Razon/)).toHaveTextContent("Razon *");
  });

  it("shows validation errors from stock action state", async () => {
    vi.mocked(adjustStockAction).mockResolvedValue({
      ok: false,
      fieldErrors: { reason: "La razon es requerida para descontar stock" },
    });
    const user = userEvent.setup();

    render(<ProductStockDialog productId="product-1" productName="Arroz" currentStock={12} />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.click(screen.getByRole("button", { name: "Guardar ajuste" }));

    expect(
      screen.getByText("La razon es requerida para descontar stock"),
    ).toBeInTheDocument();
  });

  it("refreshes the route after a successful stock adjustment", async () => {
    vi.mocked(adjustStockAction).mockResolvedValue({
      ok: true,
      message: "Stock actualizado",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<ProductStockDialog productId="product-1" productName="Arroz" currentStock={12} />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.type(screen.getByLabelText("Cantidad a ajustar"), "1");
    await user.type(screen.getByLabelText(/Razon/), "Conteo");
    await user.click(screen.getByRole("button", { name: "Guardar ajuste" }));

    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("asks for an optional expiry date only when adding stock", async () => {
    const user = userEvent.setup();
    vi.mocked(adjustStockAction).mockResolvedValue({ ok: true, fieldErrors: {} });
    render(<ProductStockDialog productId="product-1" productName="Yogur" currentStock={2} />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    expect(screen.queryByLabelText("Vence el (opcional)")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Cantidad a ajustar"), "6");
    expect(screen.queryByLabelText("Avisar dias antes")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Vence el (opcional)"), "2026-12-31");
    expect(screen.getByLabelText("Avisar dias antes")).toHaveValue(5);

    await user.click(screen.getByRole("button", { name: "Guardar ajuste" }));

    const formData = vi.mocked(adjustStockAction).mock.calls[0][1];
    expect(formData.get("expires_on")).toBe("2026-12-31");
    expect(formData.get("alert_days")).toBe("5");
  });

  it("lets the owner pick the batch a deduction comes from", async () => {
    const user = userEvent.setup();
    vi.mocked(adjustStockAction).mockResolvedValue({ ok: true, fieldErrors: {} });
    render(
      <ProductStockDialog
        productId="product-1"
        productName="Yogur"
        currentStock={5}
        batches={[batch({ id: "batch-1", expires_on: "2026-11-08", quantity_remaining: 2, status: "expired" })]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.type(screen.getByLabelText("Cantidad a ajustar"), "-2");
    await user.selectOptions(screen.getByLabelText("Sale de"), "batch-1");
    expect(screen.getByRole("option", { name: "Vence 08/11/2026 · 2 u. (vencido)" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Razon/), "vencido");
    await user.click(screen.getByRole("button", { name: "Guardar ajuste" }));

    const formData = vi.mocked(adjustStockAction).mock.calls[0][1];
    expect(formData.get("batch_id")).toBe("batch-1");
    expect(formData.get("batch_available")).toBe("2");
    expect(formData.get("expires_on")).toBeNull();
  });

  it("opens with the preset of a batch removal", async () => {
    const user = userEvent.setup();
    render(
      <ProductStockDialog
        productId="product-1"
        productName="Yogur"
        currentStock={5}
        triggerLabel="Retirar vencido"
        batches={[batch({ id: "batch-1", quantity_remaining: 2, status: "expired" })]}
        preset={{ quantity: -2, batchId: "batch-1", reason: "Producto vencido" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retirar vencido" }));

    expect(screen.getByLabelText("Cantidad a ajustar")).toHaveValue(-2);
    expect(screen.getByLabelText("Sale de")).toHaveValue("batch-1");
    expect(screen.getByLabelText(/Razon/)).toHaveValue("Producto vencido");
  });
});

function batch(overrides: Partial<ProductBatch>): ProductBatch {
  return {
    id: "batch",
    product_id: "product-1",
    expires_on: "2026-12-31",
    alert_days: 5,
    quantity_initial: 5,
    quantity_remaining: 5,
    created_at: "2026-11-01T00:00:00Z",
    days_left: 30,
    status: "ok",
    product_name: null,
    product_unit: null,
    ...overrides,
  };
}
