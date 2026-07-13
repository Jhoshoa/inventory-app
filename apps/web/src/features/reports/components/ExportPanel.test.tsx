import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportPanel } from "./ExportPanel";

const params = {
  range: "30d" as const,
  from: "2026-04-21",
  to: "2026-05-20",
};

describe("ExportPanel", () => {
  it("disables export actions for cashier", () => {
    render(<ExportPanel role="cashier" reportParams={params} />);

    expect(screen.getByText(/requieren rol de propietario/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /productos/i })).toBeDisabled();
  });

  it("renders csv links for owner", () => {
    render(<ExportPanel role="owner" reportParams={params} />);

    expect(screen.getByRole("link", { name: /ventas/i })).toHaveAttribute(
      "href",
      "/api/exports/sales?from_date=2026-04-21&to_date=2026-05-20",
    );
    expect(screen.getByRole("link", { name: /caja/i })).toHaveAttribute(
      "href",
      "/api/exports/cash-movements?from_date=2026-04-21&to_date=2026-05-20",
    );
    expect(screen.getByText("Ventas del POS.")).toBeInTheDocument();
    expect(screen.getByText("Cambios de inventario.")).toBeInTheDocument();
    expect(screen.getByText("Entradas/salidas manuales de efectivo.")).toBeInTheDocument();
  });
});
