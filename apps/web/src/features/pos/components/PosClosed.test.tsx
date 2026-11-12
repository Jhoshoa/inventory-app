import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PosClosed } from "./PosClosed";

describe("PosClosed", () => {
  it("the owner is sent to Caja to open it", () => {
    render(<PosClosed owner />);
    expect(screen.getByRole("heading", { level: 1, name: "Vender" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "La caja está cerrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir caja" })).toHaveAttribute("href", "/dashboard/caja");
  });

  it("the cashier is told who opens it", () => {
    render(<PosClosed owner={false} />);
    expect(screen.getByText(/el dueño tiene que abrir la caja/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir caja" })).not.toBeInTheDocument();
  });
});
