"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { errorFromResponse } from "@/lib/api/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

type UploadState = "idle" | "uploading" | "error";

export function StorePaymentQrUploader({
  currentUrl,
  onChange,
}: {
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(currentUrl);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Formato no soportado. Usar JPEG, PNG o WebP";
    }
    if (file.size > MAX_SIZE) {
      return "La imagen no debe superar los 5 MB";
    }
    return null;
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      setState("uploading");
      setErrorMessage("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/store/payment-qr", { method: "POST", body: formData });
        if (!response.ok) throw await errorFromResponse(response);
        const updated = await response.json();
        setQrUrl(updated.storefront_payment_qr_url);
        onChange(updated.storefront_payment_qr_url);
        setState("idle");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Error al subir el QR");
        setState("error");
      }
    },
    [onChange],
  );

  const processFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        setState("error");
        return;
      }
      handleUpload(file);
    },
    [validateFile, handleUpload],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleRemove = useCallback(async () => {
    setState("uploading");
    setErrorMessage("");
    try {
      const response = await fetch("/api/store/payment-qr", { method: "DELETE" });
      if (!response.ok) throw await errorFromResponse(response);
      setQrUrl(null);
      onChange(null);
      setState("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al quitar el QR");
      setState("error");
    }
  }, [onChange]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-strong">QR de pago</p>

      {state === "uploading" ? (
        <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-app-border bg-app-surface-muted">
          <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
        </div>
      ) : qrUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota (Cloudinary), sin loader configurado */}
          <img src={qrUrl} alt="QR de pago" className="h-40 w-40 rounded-lg border border-app-border object-contain" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Cambiar
            </Button>
            <Button variant="danger" onClick={handleRemove}>
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Subir foto de tu QR de pago"
          className="flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-app-border bg-app-surface-muted text-center transition-colors hover:border-brand-700 hover:bg-app-surface"
        >
          <p className="px-2 text-xs text-text-muted">Arrastra o haz clic para subir tu QR</p>
        </div>
      )}

      {state === "error" ? <Alert variant="error">{errorMessage}</Alert> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
