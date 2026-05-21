import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImportsTable } from "./ImportsTable";
import type { InventoryImport } from "../types";

describe("ImportsTable", () => {
  it("renders empty state", () => {
    render(<ImportsTable imports={[]} />);
    expect(screen.getByText("Sin imagenes importadas para este filtro")).toBeInTheDocument();
  });

  it("renders imports with status badges", () => {
    render(<ImportsTable imports={[importRow]} />);
    expect(screen.getByText("lista.png")).toBeInTheDocument();
    expect(screen.getByText("En revision")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revisar" })).toHaveAttribute(
      "href",
      "/dashboard/imports/import-1",
    );
  });
});

const importRow: InventoryImport = {
  id: "import-1",
  status: "needs_review",
  source_filename: "lista.png",
  source_content_type: "image/png",
  source_photo_url: null,
  raw_text: null,
  error_message: null,
  items_count: 2,
  items: [],
};
