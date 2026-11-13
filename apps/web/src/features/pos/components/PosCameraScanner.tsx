"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/Dialog";
import { usePageVisible } from "@/lib/hooks/usePageVisible";

type ScannerStatus = "starting" | "scanning" | "error";

export function PosCameraScanner({
  open,
  onOpenChange,
  onDetected,
  onTypeCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  /** "Escribir el código" (tablero P04): cierra y deja escribirlo a mano. */
  onTypeCode?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  // Con la app en segundo plano la cámara se apaga (se libera, no solo se pausa) y
  // vuelve a encenderse al regresar, si la ventana sigue abierta.
  const pageVisible = usePageVisible();
  const active = open && pageVisible;

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Como un `using` de C#: la limpieza de abajo libera la cámara siempre que el efecto
  // termina (al cerrar la ventana, al salir de la pantalla o al ocultarse la página).
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let detected = false;
    let controls: { stop: () => void } | null = null;
    setStatus("starting");
    setError(null);

    async function start() {
      try {
        // Loaded on demand so the decoder stays out of the POS bundle until the camera is used.
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelled || !videoRef.current) return;

        const hints = new Map([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [
              BarcodeFormat.QR_CODE,
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
            ],
          ],
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        const scannerControls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, _decodeError, activeControls) => {
            if (!result || detected) return;
            const code = result.getText().trim();
            if (!code) return;
            detected = true;
            activeControls.stop();
            onDetectedRef.current(code);
          },
        );

        if (cancelled) {
          scannerControls.stop();
          return;
        }
        controls = scannerControls;
        setStatus("scanning");
      } catch (startError) {
        if (cancelled) return;
        setStatus("error");
        setError(cameraErrorMessage(startError));
      }
    }

    void start();

    return () => {
      // Si la cámara todavía está abriendo, `cancelled` hace que start() la cierre apenas abra.
      cancelled = true;
      controls?.stop();
    };
  }, [active]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="md" position="sheet">
      <DialogTitle close>Escanear código</DialogTitle>
      <DialogDescription>Apunta al código QR o de barras. Al leerlo se cierra solo.</DialogDescription>
      <DialogBody>
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            aria-label="Vista de la cámara"
          />
          {status === "scanning" ? (
            <div
              className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-white/80"
              aria-hidden
            />
          ) : null}
          {status === "starting" ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white">
              Iniciando cámara…
            </p>
          ) : null}
        </div>
        {error ? (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => {
            onOpenChange(false);
            onTypeCode?.();
          }}
        >
          Escribir el código
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function cameraErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Permite la cámara en tu navegador o escribe el código.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No se encontró una cámara en este dispositivo. Escribe el código.";
  }
  if (name === "NotReadableError") {
    return "Otra aplicación está usando la cámara. Ciérrala o escribe el código.";
  }
  return "No se pudo iniciar la cámara. Escribe el código.";
}
