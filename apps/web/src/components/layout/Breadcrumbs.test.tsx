import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders parent links and current page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Productos", href: "/dashboard/products" },
          { label: "Detalle" },
        ]}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Ruta de navegacion" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Productos" })).toHaveAttribute("href", "/dashboard/products");
    expect(screen.getByText("Detalle")).toHaveAttribute("aria-current", "page");
  });

  it("marks the final linked item as current page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reportes", href: "/dashboard/reports" },
        ]}
      />,
    );

    expect(screen.getByText("Reportes")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Reportes" })).not.toBeInTheDocument();
  });
});
