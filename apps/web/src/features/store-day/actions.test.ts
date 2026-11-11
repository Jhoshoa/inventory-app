import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const getAuthToken = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthToken: () => getAuthToken(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

import {
  closeStoreDayAction,
  createCashMovementAction,
  openStoreDayAction,
  voidCashMovementAction,
} from "./actions";
import type { StoreDayActionState } from "./types";

const initialState: StoreDayActionState = { ok: false, fieldErrors: {} };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function lastBody() {
  return apiRequest.mock.calls.at(-1)?.[1]?.body;
}

describe("store-day actions", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getAuthToken.mockReset();
    revalidatePath.mockReset();
    getAuthToken.mockResolvedValue("token");
    apiRequest.mockResolvedValue({ ok: true, data: {} });
  });

  it("abre la caja con 0 y envía el monto con punto", async () => {
    const zero = await openStoreDayAction(initialState, form({ opening_cash_amount: "0" }));
    expect(zero.ok).toBe(true);
    expect(lastBody()).toMatchObject({ opening_cash_amount: "0" });

    await openStoreDayAction(initialState, form({ opening_cash_amount: "150,50" }));
    expect(lastBody()).toMatchObject({ opening_cash_amount: "150.50" });
  });

  it("cierra con efectivo contado en 0 o con coma", async () => {
    const zero = await closeStoreDayAction(initialState, form({ counted_cash_amount: "0" }));
    expect(zero.ok).toBe(true);
    expect(lastBody()).toMatchObject({ counted_cash_amount: "0", skip_cash_count: false });

    await closeStoreDayAction(initialState, form({ counted_cash_amount: "862,30" }));
    expect(lastBody()).toMatchObject({ counted_cash_amount: "862.30" });
  });

  it("cerrar sin contar no pide monto", async () => {
    const result = await closeStoreDayAction(initialState, form({ skip_cash_count: "on" }));
    expect(result.ok).toBe(true);
    expect(lastBody()).toMatchObject({ counted_cash_amount: null, skip_cash_count: true });
  });

  it("un movimiento de caja no puede ser 0 y acepta coma", async () => {
    const zero = await createCashMovementAction(initialState, form({ movement_type: "expense", amount: "0" }));
    expect(zero.ok).toBe(false);
    expect(zero.fieldErrors.amount).toBe("Monto debe ser mayor a 0");
    expect(apiRequest).not.toHaveBeenCalled();

    const ok = await createCashMovementAction(initialState, form({ movement_type: "expense", amount: "12,5" }));
    expect(ok.ok).toBe(true);
    expect(lastBody()).toMatchObject({ amount: "12.5" });
  });

  it("anular un movimiento exige la razón y la envía tal cual", async () => {
    const missing = await voidCashMovementAction(initialState, form({ movement_id: "m-1", void_reason: "  " }));
    expect(missing.ok).toBe(false);
    expect(missing.fieldErrors.void_reason).toBe("Escribe por qué anulas el movimiento");
    expect(apiRequest).not.toHaveBeenCalled();

    const ok = await voidCashMovementAction(
      initialState,
      form({ movement_id: "m-1", void_reason: " Se registró dos veces " }),
    );
    expect(ok.ok).toBe(true);
    expect(apiRequest).toHaveBeenCalledWith(
      "/cash-movements/m-1/void",
      expect.objectContaining({ method: "POST", body: { void_reason: "Se registró dos veces" } }),
    );
  });
});
