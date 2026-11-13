import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateDiscountPolicyAction, updateStoreAction } from "../actions";
import { makeStore } from "../test/fixtures";
import { DiscountPolicyForm } from "./DiscountPolicyForm";
import { SettingsIndex } from "./SettingsIndex";
import { StoreDataForm } from "./StoreDataForm";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }), usePathname: () => "/dashboard/settings" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../actions", () => ({ updateStoreAction: vi.fn(), updateDiscountPolicyAction: vi.fn() }));

describe("Configuración", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(updateStoreAction).mockReset();
    vi.mocked(updateDiscountPolicyAction).mockReset();
  });

  it("index: groups, summaries and search", async () => {
    const user = userEvent.setup();
    render(
      <SettingsIndex
        storeName="Tienda Local"
        plan="Plan Prueba · quedan 9 días"
        rows={{ precios: { summary: "Hasta 15% · cajeros con permiso" }, catalogo: { tag: { label: "Activo", tone: "success" } } }}
      />,
    );
    expect(screen.getByText("Plan Prueba · quedan 9 días")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Precios y descuentos.*Hasta 15%/ })).toHaveAttribute("href", "/dashboard/settings/precios");
    expect(screen.getByRole("link", { name: /Catálogo público.*Activo/ })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar en Configuración"), "WhatsApp");
    expect(screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/dashboard/settings/") && link.textContent !== "Ver planes").map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard/settings/catalogo",
    ]);
  });

  it("store data: unsaved bar, validation and save", async () => {
    vi.mocked(updateStoreAction).mockResolvedValue({ ok: true, message: "Guardado", fieldErrors: {} });
    const user = userEvent.setup();
    render(<StoreDataForm store={makeStore()} />);

    expect(screen.getByLabelText("Zona horaria")).toHaveValue("Bolivia (La Paz) · GMT−4");
    expect(screen.queryByRole("region", { name: "Cambios sin guardar" })).not.toBeInTheDocument();

    const name = screen.getByLabelText("Nombre de la tienda");
    await user.clear(name);
    const bar = await screen.findByRole("region", { name: "Cambios sin guardar" });
    await user.click(within(bar).getByRole("button", { name: "Guardar" }));
    expect(screen.getByText("El nombre de la tienda es requerido")).toBeInTheDocument();
    expect(updateStoreAction).not.toHaveBeenCalled();

    await user.type(name, "Tienda Central");
    await user.click(within(bar).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateStoreAction).toHaveBeenCalled());
    const formData = vi.mocked(updateStoreAction).mock.calls[0][1];
    expect(formData.get("name")).toBe("Tienda Central");
    expect(formData.get("phone")).toBe("59171234567");
    await waitFor(() => expect(screen.queryByRole("region", { name: "Cambios sin guardar" })).not.toBeInTheDocument());
  });

  it("store data: discard goes back to what is saved", async () => {
    const user = userEvent.setup();
    render(<StoreDataForm store={makeStore()} />);
    await user.type(screen.getByLabelText(/Dirección/), " piso 2");
    const bar = await screen.findByRole("region", { name: "Cambios sin guardar" });
    await user.click(within(bar).getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.getByLabelText(/Dirección/)).toHaveValue("Av. Busch 1240"));
  });

  it("discounts: a limit above 0 to enable, comma amounts", async () => {
    vi.mocked(updateDiscountPolicyAction).mockResolvedValue({ ok: true, message: "Guardado", fieldErrors: {} });
    const user = userEvent.setup();
    render(<DiscountPolicyForm store={makeStore()} />);

    await user.click(screen.getByRole("switch", { name: /Rebaja en bolivianos/ }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByText("Define un monto máximo mayor a 0 para habilitar esta opción.")).toBeInTheDocument();
    expect(updateDiscountPolicyAction).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Hasta (Bs)"), "5,50");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const formData = vi.mocked(updateDiscountPolicyAction).mock.calls[0][1];
    expect(formData.get("allow_manual_discount")).toBe("on");
    expect(formData.get("max_manual_discount_amount")).toBe("5,50");
    expect(formData.get("max_percentage_discount")).toBe("15");
    expect(formData.get("allow_cashier_discount_override")).toBe("on");
  });
});
