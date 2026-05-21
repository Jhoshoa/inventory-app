import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StockMovementsTable, movementTypeLabel } from "./StockMovementsTable";
import type { StockMovement } from "../types";

const movements: StockMovement[] = [
  {
    id: "movement-1",
    product_id: "product-123456",
    sale_id: "sale-123456",
    movement_type: "sale_void",
    quantity_delta: 2,
    stock_after: 8,
    reason: "Venta anulada",
    device_id: "web-pos",
    created_at: "2026-05-20T10:00:00Z",
  },
];

describe("StockMovementsTable", () => {
  it("formats movement rows", () => {
    render(<StockMovementsTable movements={movements} />);

    expect(screen.getByText("Anulacion")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("Venta anulada")).toBeInTheDocument();
  });

  it("maps known movement labels", () => {
    expect(movementTypeLabel("manual_adjustment")).toBe("Ajuste");
  });
});
