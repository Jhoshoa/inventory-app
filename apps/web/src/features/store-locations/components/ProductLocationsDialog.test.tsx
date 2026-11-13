import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStoreLocationAction, setProductLocationsAction } from "../actions";
import type { StoreLocation } from "../types";
import { ProductLocationsDialog } from "./ProductLocationsDialog";

const refresh = vi.fn();
vi.mock("../actions", () => ({ setProductLocationsAction: vi.fn(), saveStoreLocationAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const place = (id: string, label: string): StoreLocation => ({ id, zone: label, shelf: null, level: null, label, product_count: 0 });

describe("ProductLocationsDialog", () => {
  beforeEach(() => {
    vi.mocked(setProductLocationsAction).mockReset();
    vi.mocked(saveStoreLocationAction).mockReset();
    refresh.mockReset();
  });

  it("marks places, first as Exhibición, and saves them", async () => {
    vi.mocked(setProductLocationsAction).mockResolvedValue({ ok: true, message: "ok" });
    render(<ProductLocationsDialog productId="p-1" current={[]} storeLocations={[place("l-1", "Heladera"), place("l-2", "Depósito")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir lugares" }));
    const dialog = screen.getByRole("dialog", { name: "Dónde está" });
    fireEvent.click(within(dialog).getByLabelText("Heladera"));
    fireEvent.click(within(dialog).getByLabelText("Depósito"));
    expect(within(dialog).getByLabelText("Tipo de lugar para Heladera")).toHaveValue("display");
    expect(within(dialog).getByLabelText("Tipo de lugar para Depósito")).toHaveValue("storage");
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(setProductLocationsAction).toHaveBeenCalledWith("p-1", [
        { location_id: "l-1", kind: "display" },
        { location_id: "l-2", kind: "storage" },
      ]),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("has a search with more than 8 places and a limit of 6", () => {
    const places = Array.from({ length: 9 }, (_, index) => place(`l-${index}`, `Pasillo ${index}`));
    render(<ProductLocationsDialog productId="p-1" current={[]} storeLocations={places} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir lugares" }));
    const dialog = screen.getByRole("dialog", { name: "Dónde está" });
    for (let index = 0; index < 6; index += 1) fireEvent.click(within(dialog).getByLabelText(`Pasillo ${index}`));
    expect(within(dialog).getByLabelText("Pasillo 7")).toBeDisabled();
    expect(within(dialog).getByText(/Llegaste al máximo de 6 lugares/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Buscar lugar"), { target: { value: "8" } });
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(1);
  });

  it("creates a place on top and comes back with it marked; Escape closes only the top window", async () => {
    vi.mocked(saveStoreLocationAction).mockResolvedValue({ ok: true, location: place("l-9", "Mostrador"), fieldErrors: {} });
    render(<ProductLocationsDialog productId="p-1" current={[]} storeLocations={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir lugares" }));
    expect(screen.getByText("Todavía no hay lugares")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Nuevo lugar" }));
    expect(screen.getByRole("dialog", { name: "Nuevo lugar en la tienda" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Nuevo lugar en la tienda" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Dónde está" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Nuevo lugar" }));
    const inner = screen.getByRole("dialog", { name: "Nuevo lugar en la tienda" });
    fireEvent.change(within(inner).getByLabelText("Zona"), { target: { value: "Mostrador" } });
    fireEvent.click(within(inner).getByRole("button", { name: "Crear y marcar" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nuevo lugar en la tienda" })).not.toBeInTheDocument());
    expect(screen.getByLabelText("Mostrador")).toBeChecked();
  });
});
