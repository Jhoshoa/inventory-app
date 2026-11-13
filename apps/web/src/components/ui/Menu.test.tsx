import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Menu, MenuItem } from "./Menu";

function renderMenu(onSelect = vi.fn()) {
  render(
    <Menu label="Más acciones de Leche" trigger="⋯">
      <MenuItem href="/a">Ver detalle</MenuItem>
      <MenuItem onSelect={onSelect} tone="danger">
        Eliminar…
      </MenuItem>
    </Menu>,
  );
  return onSelect;
}

describe("Menu", () => {
  it("opens, focuses the first item and moves with the arrows", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Más acciones de Leche" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "End" });
    expect(items[1]).toHaveFocus();
  });

  it("Escape closes and returns the focus", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Más acciones de Leche" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("choosing an item closes the menu and runs it", () => {
    const onSelect = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de Leche" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar…" }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("a click outside closes it", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de Leche" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
