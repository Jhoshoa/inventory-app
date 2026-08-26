import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("calls onConfirm and closes after it resolves", async () => {
    const user = userEvent.setup();
    let resolveConfirm: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    render(
      <ConfirmDialog title="Revocar invitacion" triggerLabel="Revocar" onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: "Revocar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Procesando..." })).toBeDisabled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    resolveConfirm();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("disables cancel and confirm while a confirmation is pending", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(() => new Promise<void>(() => {}));

    render(
      <ConfirmDialog title="Desactivar usuario" triggerLabel="Desactivar" onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Procesando..." })).toBeDisabled();
  });

  it("keeps the dialog open and re-enables the button if onConfirm rejects", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error("network error"));

    render(<ConfirmDialog title="Revocar" triggerLabel="Revocar" onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Revocar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes without calling onConfirm when cancelled", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<ConfirmDialog title="Revocar" triggerLabel="Revocar" onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Revocar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
