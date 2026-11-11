import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { voidCashMovementAction } from "../actions";
import type { CashMovement } from "../types";
import { CashMovementRow } from "./CashMovementRow";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../actions", () => ({
  voidCashMovementAction: vi.fn(),
}));

const movement: CashMovement = {
  id: "m-1",
  store_id: "s-1",
  business_day_id: "d-1",
  movement_type: "expense",
  direction: "out",
  amount: "20.00",
  note: "Bolsas",
  created_by_user_id: "u-1",
  occurred_at: "2026-11-11T12:00:00Z",
  created_at: "2026-11-11T12:00:00Z",
  voided_at: null,
  voided_by_user_id: null,
  void_reason: null,
};

describe("CashMovementRow", () => {
  beforeEach(() => {
    vi.mocked(voidCashMovementAction).mockReset();
    refresh.mockReset();
  });

  it("marca la razón como obligatoria y muestra el error en el campo", async () => {
    vi.mocked(voidCashMovementAction).mockResolvedValue({
      ok: false,
      fieldErrors: { void_reason: "Escribe por qué anulas el movimiento" },
    });
    const user = userEvent.setup();
    render(<CashMovementRow movement={movement} />);

    const input = screen.getByLabelText("Razón de anulación");
    expect(input).toHaveAttribute("placeholder", "Razón (obligatoria)");
    expect(input).toBeRequired();

    await user.click(screen.getByRole("button", { name: "Anular" }));

    expect(await screen.findByText("Escribe por qué anulas el movimiento")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();

    await user.type(input, "D");
    expect(screen.queryByText("Escribe por qué anulas el movimiento")).not.toBeInTheDocument();
  });

  it("anula con razón y refresca", async () => {
    vi.mocked(voidCashMovementAction).mockResolvedValue({ ok: true, fieldErrors: {} });
    const user = userEvent.setup();
    render(<CashMovementRow movement={movement} />);

    await user.type(screen.getByLabelText("Razón de anulación"), "Duplicado");
    await user.click(screen.getByRole("button", { name: "Anular" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const sent = vi.mocked(voidCashMovementAction).mock.calls[0][1] as FormData;
    expect(sent.get("void_reason")).toBe("Duplicado");
    expect(sent.get("movement_id")).toBe("m-1");
  });
});
