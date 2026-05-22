import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoreClosedNotice } from "./StoreClosedNotice";

describe("StoreClosedNotice", () => {
  it("explains that the POS is blocked while the store is closed", () => {
    render(<StoreClosedNotice />);

    expect(screen.getByText("Tienda cerrada")).toBeInTheDocument();
    expect(screen.getByText(/Un owner debe abrir la jornada/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});
