"use client";

/* eslint-disable @next/next/no-img-element */

import { Download, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DialogSurface } from "@/components/ui/Dialog";

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

    import("qrcode")
      .then((QRCode) =>
        QRCode.toString(normalizedCode, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 2,
          width: 240,
        }),
      )
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
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [svg]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="presentation"
    >
      <DialogSurface
        className="w-full max-w-md space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-preview-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="qr-preview-title" className="text-lg font-semibold text-slate-950">
              QR del producto
            </h2>
            {productName ? (
              <p className="mt-1 text-sm text-slate-600">{productName}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-400"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6">
          {isGenerating ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Generando QR...
            </div>
          ) : previewSrc ? (
            <img
              src={previewSrc}
              alt={`QR para ${normalizedCode}`}
              className="h-60 w-60 rounded-md bg-white p-3"
            />
          ) : (
            <p className="text-sm text-slate-600">
              {error ?? "Ingresa un codigo escaneable para generar el QR."}
            </p>
          )}
        </div>

        <div className="rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
          {normalizedCode || "Sin codigo"}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" onClick={() => downloadSvg(svg, normalizedCode)} disabled={!svg}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar SVG
          </Button>
        </div>
      </DialogSurface>
    </div>
  );
}

function downloadSvg(svg: string, code: string) {
  if (!svg || !code) return;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `qr-${toSafeFilename(code)}.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toSafeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "producto";
}
