import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImportReviewTable } from "./ImportReviewTable";
import type { InventoryImport } from "../types";

describe("ImportReviewTable", () => {
  it("renders items and confidence", () => {
    render(<ImportReviewTable inventoryImport={inventoryImport} />);

    expect(screen.getByText("Arroz")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});

const inventoryImport: InventoryImport = {
  id: "import-1",
  status: "needs_review",
  source_filename: "lista.png",
  source_content_type: "image/png",
  source_photo_url: null,
  raw_text: "Arroz 10 5",
  error_message: null,
  items_count: 1,
  items: [
    {
      id: "item-1",
      import_id: "import-1",
      status: "draft",
      row_number: 1,
      name: "Arroz",
      category: "Alimentos",
      sku: null,
      unit: "unidad",
      price: "10",
      cost_price: null,
      stock: 5,
      min_stock: 2,
      confidence: "0.8",
      raw_data: {},
      product_id: null,
      error_message: null,
    },
  ],
};
