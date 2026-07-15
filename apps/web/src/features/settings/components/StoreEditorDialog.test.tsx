import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreEditorDialog } from "./StoreEditorDialog";
import { updateStoreAction } from "../actions";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("../actions", () => ({
  updateStoreAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const storeData = {
  id: "store-1",
  name: "Mi Tienda",
  address: "Av. Siempre Viva 123",
  phone: "77712345",
  is_active: true,
};

describe("StoreEditorDialog", () => {
  beforeEach(() => {
    vi.mocked(updateStoreAction).mockReset();
    mocks.refresh.mockClear();
  });

  it("opens the dialog and shows validation errors", async () => {
    vi.mocked(updateStoreAction).mockResolvedValue({
      ok: false,
      message: "Corrige los errores del formulario",
      fieldErrors: { name: "El nombre de la tienda es requerido" },
    });
    const user = userEvent.setup();

    render(<StoreEditorDialog storeData={storeData} />);

    await user.click(screen.getByRole("button", { name: /editar/i }));
    await user.clear(screen.getByLabelText("Nombre de la tienda"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("El nombre de la tienda es requerido"),
    ).toBeInTheDocument();
  });

  it("refreshes the route after a successful update", async () => {
    vi.mocked(updateStoreAction).mockResolvedValue({
      ok: true,
      message: "Tienda actualizada correctamente",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<StoreEditorDialog storeData={storeData} />);

    await user.click(screen.getByRole("button", { name: /editar/i }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mocks.refresh).toHaveBeenCalled();
  });
});
