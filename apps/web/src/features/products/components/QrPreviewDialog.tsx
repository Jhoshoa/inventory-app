"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { generateQrSvg, svgToDataUri, toQrFilename } from "../qr";

interface QrPreviewDialogProps {
  open: boolean;
  code: string;
  productName?: string;
  onClose: () => void;
}

export function QrPreviewDialog({
  open,
  code,
  productName,
  onClose,
}: QrPreviewDialogProps) {
  const normalizedCode = code.trim();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!open || !normalizedCode) {
      setSvg("");
      setError(null);
      setIsGenerating(false);
      return;
    }

    let isCurrent = true;
    setIsGenerating(true);
    setError(null);

    generateQrSvg(normalizedCode, 240)
      .then((nextSvg) => {
        if (isCurrent) setSvg(nextSvg);
      })
      .catch(() => {
        if (isCurrent) setError("No se pudo generar el QR.");
      })
      .finally(() => {
        if (isCurrent) setIsGenerating(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [open, normalizedCode]);

  const previewSrc = useMemo(() => {
    if (!svg) return "";
    return svgToDataUri(svg);
  }, [svg]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogTitle close>QR del producto</DialogTitle>
      {productName ? (
        <DialogDescription>{productName}</DialogDescription>
      ) : null}
      <DialogBody>
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-app-border bg-app-surface-muted p-6">
          {isGenerating ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Generando QR...
            </div>
          ) : previewSrc ? (
            <img
              src={previewSrc}
              alt={`QR para ${normalizedCode}`}
              className="h-60 w-60 rounded-md bg-app-surface p-3"
            />
          ) : (
            <p className="text-sm text-text-muted">
              {error ?? "Ingresa un codigo escaneable para generar el QR."}
            </p>
          )}
        </div>
        <div className="mt-4 rounded-md bg-app-surface-muted px-3 py-2 font-mono text-sm text-text-body">
          {normalizedCode || "Sin codigo"}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={() => downloadSvg(svg, normalizedCode)} disabled={!svg}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Descargar SVG
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function downloadSvg(svg: string, code: string) {
  if (!svg || !code) return;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `qr-${toQrFilename(code)}.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
