import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PosCameraScanner } from "./PosCameraScanner";

const decodeFromConstraints = vi.fn();

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromConstraints = decodeFromConstraints;
  },
}));

/** La cámara abre bien y devuelve sus controles; `stop` es lo que la libera. */
function cameraOpens() {
  const stop = vi.fn();
  decodeFromConstraints.mockImplementation(async () => ({ stop }));
  return stop;
}

let visibility: DocumentVisibilityState = "visible";
function setPageVisibility(state: DocumentVisibilityState) {
  visibility = state;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("PosCameraScanner", () => {
  beforeAll(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    decodeFromConstraints.mockReset();
    visibility = "visible";
  });

  it("reports the first detected code once and stops the camera", async () => {
    const stop = vi.fn();
    const onDetected = vi.fn();
    decodeFromConstraints.mockImplementation(async (_constraints, _video, callback) => {
      const controls = { stop };
      callback({ getText: () => " QR-1 " }, undefined, controls);
      callback({ getText: () => "QR-2" }, undefined, controls);
      return controls;
    });

    render(<PosCameraScanner open onOpenChange={vi.fn()} onDetected={onDetected} />);

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith("QR-1"));
    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalled();
    expect(decodeFromConstraints.mock.calls[0][0]).toEqual({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
  });

  it("explains when camera permission is denied", async () => {
    decodeFromConstraints.mockRejectedValue(
      Object.assign(new Error("Permission denied"), { name: "NotAllowedError" }),
    );

    render(<PosCameraScanner open onOpenChange={vi.fn()} onDetected={vi.fn()} />);

    expect(
      await screen.findByText("Permite la cámara en tu navegador o escribe el código."),
    ).toBeInTheDocument();
  });

  it("does not start the camera while closed", () => {
    render(<PosCameraScanner open={false} onOpenChange={vi.fn()} onDetected={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(decodeFromConstraints).not.toHaveBeenCalled();
  });

  it("releases the camera when the window closes", async () => {
    const stop = cameraOpens();
    const { rerender } = render(<PosCameraScanner open onOpenChange={vi.fn()} onDetected={vi.fn()} />);
    await screen.findByLabelText("Vista de la cámara");
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalledTimes(1));
    await act(async () => {});

    rerender(<PosCameraScanner open={false} onOpenChange={vi.fn()} onDetected={vi.fn()} />);

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("releases the camera when leaving the screen", async () => {
    const stop = cameraOpens();
    const { unmount } = render(<PosCameraScanner open onOpenChange={vi.fn()} onDetected={vi.fn()} />);
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalledTimes(1));
    await act(async () => {});

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("turns the camera off while the app is in the background and back on when it returns", async () => {
    const stop = cameraOpens();
    render(<PosCameraScanner open onOpenChange={vi.fn()} onDetected={vi.fn()} />);
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalledTimes(1));
    await act(async () => {});

    setPageVisibility("hidden");
    expect(stop).toHaveBeenCalledTimes(1);

    setPageVisibility("visible");
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalledTimes(2));
    await act(async () => {});

    // La cámara que se volvió a abrir también se libera.
    setPageVisibility("hidden");
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("never opens the camera while the app is in the background", async () => {
    cameraOpens();
    visibility = "hidden";

    render(<PosCameraScanner open onOpenChange={vi.fn()} onDetected={vi.fn()} />);
    await act(async () => {});

    expect(decodeFromConstraints).not.toHaveBeenCalled();
  });

  it("releases the camera even if the window closes while it is still opening", async () => {
    // Por ejemplo, mientras el navegador todavía pregunta por el permiso.
    const stop = vi.fn();
    let finishOpening: (controls: { stop: () => void }) => void = () => {};
    decodeFromConstraints.mockImplementation(() => new Promise((resolve) => (finishOpening = resolve)));
    const { rerender } = render(<PosCameraScanner open onOpenChange={vi.fn()} onDetected={vi.fn()} />);
    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalledTimes(1));

    rerender(<PosCameraScanner open={false} onOpenChange={vi.fn()} onDetected={vi.fn()} />);
    expect(stop).not.toHaveBeenCalled();

    await act(async () => finishOpening({ stop }));

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
