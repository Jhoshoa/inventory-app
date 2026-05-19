import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductForm } from "./ProductForm";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      {
        ok: false,
        fieldErrors: {
          name: "Nombre es requerido",
          price: "Precio debe ser mayor a 0",
        },
      },
      vi.fn(),
      false,
    ],
  };
});

describe("ProductForm", () => {
  it("shows field errors", () => {
    render(<ProductForm mode="create" />);

    expect(screen.getByText("Nombre es requerido")).toBeInTheDocument();
    expect(screen.getByText("Precio debe ser mayor a 0")).toBeInTheDocument();
  });
});
