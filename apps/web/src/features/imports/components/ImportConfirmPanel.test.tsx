import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImportConfirmPanel } from "./ImportConfirmPanel";
import type { InventoryImport } from "../types";

describe("ImportConfirmPanel", () => {
  it("disables confirmation for cashier", () => {
    render(<ImportConfirmPanel inventoryImport={inventoryImport} role="cashier" />);
    expect(screen.getByText(/requiere rol owner/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar importacion/i })).toBeDisabled();
  });

  it("blocks confirmation without approved items", () => {
    render(<ImportConfirmPanel inventoryImport={{ ...inventoryImport, items: [] }} role="owner" />);
    expect(screen.getByRole("button", { name: /confirmar importacion/i })).toBeDisabled();
  });
});

const inventoryImport: InventoryImport = {
  id: "import-1",
  status: "needs_review",
  source_filename: "lista.png",
  source_content_type: "image/png",
  source_photo_url: null,
  raw_text: null,
  error_message: null,
  items_count: 1,
  items: [
    {
      id: "item-1",
      import_id: "import-1",
      status: "approved",
      row_number: 1,
      name: "Arroz",
      category: null,
      sku: null,
      unit: "unidad",
      price: "10",
      cost_price: null,
      stock: 2,
      min_stock: 1,
      confidence: null,
      raw_data: {},
      product_id: null,
      error_message: null,
    },
  ],
};
