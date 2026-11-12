import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateDefaultAlertDaysAction } from "../actions";
import { ExpiryAlertDialog } from "./ExpiryAlertDialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../actions", () => ({ updateDefaultAlertDaysAction: vi.fn() }));

describe("ExpiryAlertDialog", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(updateDefaultAlertDaysAction).mockReset();
  });

  it("saves a new number of days", async () => {
    vi.mocked(updateDefaultAlertDaysAction).mockResolvedValue({ ok: true, days: 10 });
    const onOpenChange = vi.fn();
    render(<ExpiryAlertDialog open days={5} onOpenChange={onOpenChange} />);
    const input = screen.getByLabelText("Avisar por defecto (días antes)");
    expect(input).toHaveValue(5);
    expect(input).toHaveFocus();
    expect(screen.getByText(/Al vender sale primero el lote que vence antes/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateDefaultAlertDaysAction).toHaveBeenCalledWith("10"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(refresh).toHaveBeenCalled();
  });

  it("rejects numbers outside 0–365 without calling the API", () => {
    render(<ExpiryAlertDialog open days={5} onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Avisar por defecto (días antes)"), { target: { value: "400" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByText("Un número entero de 0 a 365")).toBeInTheDocument();
    expect(updateDefaultAlertDaysAction).not.toHaveBeenCalled();
  });

  it("closes without saving when nothing changed", () => {
    const onOpenChange = vi.fn();
    render(<ExpiryAlertDialog open days={5} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(updateDefaultAlertDaysAction).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
