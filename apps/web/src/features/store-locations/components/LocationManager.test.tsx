import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteStoreLocationAction, saveStoreLocationAction } from "../actions";
import type { StoreLocation } from "../types";
import { LocationManager } from "./LocationManager";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/dashboard/products/lugares",
}));

vi.mock("../actions", () => ({
  saveStoreLocationAction: vi.fn(),
  deleteStoreLocationAction: vi.fn(),
}));

const locations: StoreLocation[] = [
  { id: "l-1", zone: "Heladera", shelf: null, level: null, label: "Heladera", product_count: 6 },
  { id: "l-2", zone: "Pasillo 2", shelf: "Estante B", level: "3", label: "Pasillo 2 · Estante B · 3", product_count: 0 },
];

describe("LocationManager", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(saveStoreLocationAction).mockReset();
    vi.mocked(deleteStoreLocationAction).mockReset();
  });

  it("lists zone, shelf, level and product count", () => {
    render(<LocationManager locations={locations} />);
    expect(screen.getByText("2 lugares")).toBeInTheDocument();
    const table = screen.getByRole("table");
    const row = within(table).getByText("Pasillo 2").closest("tr")!;
    expect(within(row).getByText("Estante B")).toBeInTheDocument();
    expect(within(row).getByText("3")).toBeInTheDocument();
    const cards = screen.getByRole("list", { name: "Lugares en la tienda" });
    expect(within(cards).getByText("6 productos")).toBeInTheDocument();
    expect(within(cards).getByText("Sin productos")).toBeInTheDocument();
  });

  it("the phone adds a place without leaving the list", async () => {
    vi.mocked(saveStoreLocationAction).mockResolvedValue({
      ok: true,
      message: "Lugar agregado",
      location: { id: "l-3", zone: "Mostrador", shelf: null, level: null, label: "Mostrador", product_count: 0 },
      fieldErrors: {},
    });
    render(<LocationManager locations={locations} />);
    const section = screen.getByRole("region", { name: "Nuevo lugar" });
    fireEvent.change(within(section).getByLabelText("Zona"), { target: { value: "Mostrador" } });
    fireEvent.click(within(section).getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(vi.mocked(saveStoreLocationAction).mock.calls[0][1].get("zone")).toBe("Mostrador");
    expect(within(section).getByLabelText("Zona")).toHaveValue("");
  });

  it("validates a level without a shelf before calling the API", () => {
    render(<LocationManager locations={locations} />);
    const section = screen.getByRole("region", { name: "Nuevo lugar" });
    fireEvent.change(within(section).getByLabelText("Zona"), { target: { value: "Depósito" } });
    fireEvent.change(within(section).getByLabelText(/Nivel/), { target: { value: "2" } });
    fireEvent.click(within(section).getByRole("button", { name: "Agregar" }));
    expect(within(section).getByText("Para poner un nivel, primero escribe el estante")).toBeInTheDocument();
    expect(saveStoreLocationAction).not.toHaveBeenCalled();
  });

  it("shows a repeated place on the zone field", async () => {
    vi.mocked(saveStoreLocationAction).mockResolvedValue({ ok: false, fieldErrors: { zone: "Ese lugar ya existe." } });
    render(<LocationManager locations={locations} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Nuevo lugar/ })[0]);
    const dialog = screen.getByRole("dialog", { name: "Nuevo lugar" });
    fireEvent.change(within(dialog).getByLabelText("Zona"), { target: { value: "heladera" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));
    expect(await within(dialog).findByText("Ese lugar ya existe.")).toBeInTheDocument();
  });

  it("edits with the place id", async () => {
    vi.mocked(saveStoreLocationAction).mockResolvedValue({ ok: true, location: locations[0], fieldErrors: {} });
    render(<LocationManager locations={locations} />);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Editar Heladera" }));
    const dialog = screen.getByRole("dialog", { name: "Editar lugar" });
    expect(within(dialog).getByLabelText("Zona")).toHaveValue("Heladera");
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(vi.mocked(saveStoreLocationAction).mock.calls[0][1].get("location_id")).toBe("l-1");
  });

  it("deleting warns how many products lose the place", async () => {
    vi.mocked(deleteStoreLocationAction).mockResolvedValue({ ok: true, message: "Lugar eliminado" });
    render(<LocationManager locations={locations} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Heladera" }));
    const confirm = screen.getByRole("dialog", { name: '¿Eliminar "Heladera"?' });
    expect(within(confirm).getByText(/Se quita de 6 productos\. Los productos y su stock no cambian/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Eliminar lugar" }));
    await waitFor(() => expect(deleteStoreLocationAction).toHaveBeenCalledWith("l-1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("delete is also reachable from Editar", () => {
    render(<LocationManager locations={locations} />);
    fireEvent.click(within(screen.getByRole("list", { name: "Lugares en la tienda" })).getByRole("button", { name: /Editar Pasillo 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar…" }));
    expect(screen.getByRole("dialog", { name: '¿Eliminar "Pasillo 2 · Estante B · 3"?' })).toHaveTextContent("Ningún producto lo usa.");
  });

  it("empty and error states", () => {
    const { rerender } = render(<LocationManager locations={[]} />);
    expect(screen.getByText("Todavía no hay lugares")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nuevo lugar" })).toBeInTheDocument();
    rerender(<LocationManager locations={[]} loadError="Fallo" />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refresh).toHaveBeenCalled();
  });
});
