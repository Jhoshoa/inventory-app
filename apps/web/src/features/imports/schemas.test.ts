import { describe, expect, it } from "vitest";
import {
  buildImportQueryString,
  countImportItems,
  importStatusLabel,
  itemStatusLabel,
  parseImportSearchParams,
  validateImportItem,
  validateImportUpload,
} from "./schemas";
import type { ImportItemFormValues, InventoryImportItem } from "./types";

describe("parseImportSearchParams", () => {
  it("applies defaults", () => {
    expect(parseImportSearchParams({})).toEqual({
      status: "all",
      limit: 20,
      offset: 0,
    });
  });

  it("rejects invalid values safely", () => {
    expect(parseImportSearchParams({ status: "bad", limit: "999", offset: "-1" })).toEqual({
      status: "all",
      limit: 100,
      offset: 0,
    });
  });
});

describe("buildImportQueryString", () => {
  it("serializes status and pagination", () => {
    expect(buildImportQueryString({ status: "needs_review", limit: 20, offset: 40 }))
      .toBe("status=needs_review&limit=20&offset=40");
  });
});

describe("validateImportUpload", () => {
  it("rejects invalid files", () => {
    const file = new File(["x"], "doc.txt", { type: "text/plain" });
    expect(validateImportUpload(file)).toBe("Usa una imagen JPG, PNG o WebP");
  });
});

describe("validateImportItem", () => {
  const base: ImportItemFormValues = {
    import_id: "import-1",
    item_id: "item-1",
    status: "approved",
    name: "Arroz",
    category: "",
    sku: "",
    unit: "unidad",
    price: "10",
    cost_price: "",
    stock: "5",
    min_stock: "2",
  };

  it("requires a name for approved items", () => {
    expect(validateImportItem({ ...base, name: "" })).toMatchObject({
      name: "Nombre es requerido para aprobar",
    });
  });

  it("rejects negative numeric values", () => {
    expect(validateImportItem({ ...base, price: "-1", stock: "-2", min_stock: "-3" }))
      .toMatchObject({
        price: "Precio debe ser mayor o igual a 0",
        stock: "Stock debe ser entero mayor o igual a 0",
        min_stock: "Stock minimo debe ser entero mayor o igual a 0",
      });
  });
});

describe("labels and counts", () => {
  it("maps statuses", () => {
    expect(importStatusLabel("needs_review")).toBe("En revision");
    expect(itemStatusLabel("approved")).toBe("Aprobado");
  });

  it("counts item statuses", () => {
    const items = [
      item("draft"),
      item("approved"),
      item("rejected"),
      item("imported"),
      item("failed"),
    ];
    expect(countImportItems(items)).toEqual({
      draft: 1,
      approved: 1,
      rejected: 1,
      imported: 1,
      failed: 1,
    });
  });
});

function item(status: InventoryImportItem["status"]): InventoryImportItem {
  return {
    id: `item-${status}`,
    import_id: "import-1",
    status,
    row_number: 1,
    name: "Arroz",
    category: null,
    sku: null,
    unit: "unidad",
    price: "10",
    cost_price: null,
    stock: 1,
    min_stock: 1,
    confidence: null,
    raw_data: {},
    product_id: null,
    error_message: null,
  };
}
