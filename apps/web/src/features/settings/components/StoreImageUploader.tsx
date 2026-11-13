"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { errorFromResponse } from "@/lib/api/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

type UploadState = "idle" | "uploading" | "error";

type StoreImageField = "storefront_payment_qr_url" | "storefront_logo_url" | "storefront_banner_url";

export interface StoreImageKind {
  endpoint: string;
  field: StoreImageField;
  label: string;
  alt: string;
  uploadLabel: string;
  prompt: string;
  frameClassName: string;
  imageFit: "object-contain" | "object-cover";
  uploadError: string;
  removeError: string;
}

// Todas se suben a Cloudinary: el CSP solo permite imagenes de res.cloudinary.com.
export const STORE_IMAGE_KINDS = {
  paymentQr: {
    endpoint: "/api/store/payment-qr",
    field: "storefront_payment_qr_url",
    label: "QR de pago",
    alt: "QR de pago",
    uploadLabel: "Subir foto de tu QR de pago",
    prompt: "Arrastra o haz clic para subir tu QR",
    frameClassName: "h-40 w-40",
    imageFit: "object-contain",
    uploadError: "No se pudo subir el QR",
    removeError: "No se pudo quitar el QR",
  },
  logo: {
    endpoint: "/api/store/storefront-logo",
    field: "storefront_logo_url",
    label: "Logo",
    alt: "Logo de la tienda",
    uploadLabel: "Subir logo de la tienda",
    prompt: "Arrastra o haz clic para subir tu logo",
    frameClassName: "h-28 w-28",
    imageFit: "object-contain",
    uploadError: "No se pudo subir el logo",
    removeError: "No se pudo quitar el logo",
  },
  banner: {
    endpoint: "/api/store/storefront-banner",
    field: "storefront_banner_url",
    label: "Banner",
    alt: "Banner de la tienda",
    uploadLabel: "Subir banner de la tienda",
    prompt: "Arrastra o haz clic para subir una imagen horizontal",
    frameClassName: "h-28 w-full max-w-sm",
    imageFit: "object-cover",
    uploadError: "No se pudo subir la portada",
    removeError: "No se pudo quitar la portada",
  },
} satisfies Record<string, StoreImageKind>;

export function StorePaymentQrUploader(props: {
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  return <StoreImageUploader kind={STORE_IMAGE_KINDS.paymentQr} {...props} />;
}

export function StoreImageUploader({
  kind,
  currentUrl,
  onChange,
  showLabel = true,
}: {
  kind: StoreImageKind;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
  /** Sin el título cuando la sección ya lo tiene (Datos de la tienda). */
  showLabel?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(currentUrl);

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
        const response = await fetch(kind.endpoint, { method: "POST", body: formData });
        if (!response.ok) throw await errorFromResponse(response);
        const updated = await response.json();
        setImageUrl(updated[kind.field]);
        onChange(updated[kind.field]);
        setState("idle");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : kind.uploadError);
        setState("error");
      }
    },
    [kind, onChange],
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
      const response = await fetch(kind.endpoint, { method: "DELETE" });
      if (!response.ok) throw await errorFromResponse(response);
      setImageUrl(null);
      onChange(null);
      setState("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : kind.removeError);
      setState("error");
    }
  }, [kind, onChange]);

  return (
    <div className="space-y-2">
      {showLabel ? <p className="text-sm font-medium text-text-strong">{kind.label}</p> : null}

      {state === "uploading" ? (
        <div className={`flex ${kind.frameClassName} items-center justify-center rounded-lg border border-app-border bg-app-surface-muted`}>
          <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
        </div>
      ) : imageUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota (Cloudinary), sin loader configurado */}
          <img
            src={imageUrl}
            alt={kind.alt}
            className={`${kind.frameClassName} rounded-lg border border-app-border ${kind.imageFit}`}
          />
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
          aria-label={kind.uploadLabel}
          className={`flex ${kind.frameClassName} cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-app-border bg-app-surface-muted text-center transition-colors hover:border-brand-700 hover:bg-app-surface`}
        >
          <p className="px-2 text-xs text-text-muted">{kind.prompt}</p>
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
