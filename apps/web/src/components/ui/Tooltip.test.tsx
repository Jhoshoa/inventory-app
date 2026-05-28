import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("links tooltip content to the trigger", () => {
    render(
      <Tooltip content="Editar producto">
        <button type="button" aria-label="Editar">
          E
        </button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "Editar" });
    const tooltip = screen.getByRole("tooltip");

    expect(tooltip).toHaveTextContent("Editar producto");
    expect(button).toHaveAttribute("aria-describedby", tooltip.id);
  });
});
