"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { errorFromResponse } from "@/lib/api/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

type UploadState = "idle" | "selected" | "uploading" | "error";

interface ImageUploaderProps {
  currentUrl?: string | null;
  productId?: string;
  productVersion?: number;
  onPhotoChange: (photoUrl: string | null) => void;
  disabled?: boolean;
}

export function ImageUploader({
  currentUrl,
  productId,
  productVersion,
  onPhotoChange,
  disabled = false,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(
    currentUrl ?? null,
  );

  useEffect(() => {
    setCurrentPhotoUrl(currentUrl ?? null);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return "Formato no soportado. Usar JPEG, PNG o WebP";
      }
      if (file.size > MAX_SIZE) {
        return "La imagen no debe superar los 5 MB";
      }
      return null;
    },
    [],
  );

  const uploadPhoto = useCallback(
    async (file: File): Promise<{ photo_url: string | null }> => {
      if (!productId) {
        throw new Error("Producto no disponible");
      }

      const formData = new FormData();
      formData.append("file", file);
      if (productVersion !== undefined) {
        formData.append("version", String(productVersion));
      }

      const response = await fetch(`/api/products/${productId}/photo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await errorFromResponse(response);
        throw err;
      }

      return response.json();
    },
    [productId, productVersion],
  );

  const deletePhoto = useCallback(
    async (): Promise<{ photo_url: string | null }> => {
      if (!productId) {
        throw new Error("Producto no disponible");
      }

      const response = await fetch(`/api/products/${productId}/photo`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = await errorFromResponse(response);
        throw err;
      }

      return response.json();
    },
    [productId],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      if (!productId) return;
      setState("uploading");
      setErrorMessage("");

      try {
        const updated = await uploadPhoto(file);
        setCurrentPhotoUrl(updated.photo_url);
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setState("idle");
        onPhotoChange(updated.photo_url);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error al subir imagen",
        );
        setState("error");
      }
    },
    [productId, previewUrl, onPhotoChange, uploadPhoto],
  );

  const processFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        setState("error");
        return;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const objectUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(objectUrl);
      setErrorMessage("");
      setState("selected");

      if (productId) {
        handleUpload(file);
      }
      // In create mode the file is already assigned to the input[name="photo"]
    },
    [validateFile, previewUrl, productId, handleUpload],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      e.target.value = "";
    },
    [processFile],
  );

  const handleCameraChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      e.target.value = "";
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrorMessage("");
    setState("idle");
  }, [previewUrl]);

  const handleRemove = useCallback(async () => {
    if (!productId) {
      clearSelection();
      setCurrentPhotoUrl(null);
      onPhotoChange(null);
      return;
    }

    setState("uploading");
    setErrorMessage("");

    try {
      await deletePhoto();
      setCurrentPhotoUrl(null);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setState("idle");
      onPhotoChange(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al eliminar imagen",
      );
      setState("error");
    }
  }, [productId, previewUrl, onPhotoChange, deletePhoto, clearSelection]);

  const handleRetry = useCallback(() => {
    if (selectedFile) {
      handleUpload(selectedFile);
    } else {
      clearSelection();
    }
  }, [selectedFile, handleUpload, clearSelection]);

  const hasPhoto = currentPhotoUrl || previewUrl;

  if (disabled) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-strong">Foto</p>
        {currentPhotoUrl ? (
          <div className="relative overflow-hidden rounded-lg border border-app-border">
            <img
              src={currentPhotoUrl}
              alt="Foto del producto"
              className="aspect-square w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-app-border bg-app-surface-muted">
            <p className="text-sm text-text-muted">Sin foto</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-strong">Foto</p>

      {state === "uploading" ? (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-app-border bg-app-surface-muted">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="h-8 w-8 animate-spin text-brand-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-text-muted">Subiendo foto...</p>
          </div>
        </div>
      ) : state === "error" ? (
        <div className="space-y-3">
          <Alert variant="error">{errorMessage}</Alert>
          {selectedFile ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleRetry}>
                Reintentar
              </Button>
              <Button variant="ghost" onClick={clearSelection}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setState("idle");
                setErrorMessage("");
              }}
            >
              Ok
            </Button>
          )}
        </div>
      ) : hasPhoto ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border border-app-border">
            <img
              src={previewUrl || currentPhotoUrl!}
              alt={previewUrl ? "Vista previa" : "Foto del producto"}
              className="aspect-square w-full object-cover"
            />
          </div>
          {previewUrl && selectedFile && (
            <p className="truncate text-xs text-text-muted">
              {selectedFile.name}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? "Cambiar foto" : "Reemplazar foto"}
            </Button>
            <Button variant="danger" onClick={handleRemove}>
              Quitar foto
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-app-border bg-app-surface-muted transition-colors hover:border-brand-700 hover:bg-app-surface"
          >
            <svg
              className="h-8 w-8 text-text-muted"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm text-text-muted">
              Arrastra una imagen aqui o haz clic para seleccionar
            </p>
            <p className="text-xs text-text-muted">
              JPEG, PNG o WebP &middot; Max 5 MB
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            Tomar foto con la camara
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        name="photo"
        accept="image/*"
        capture
        onChange={handleCameraChange}
        className="hidden"
      />
    </div>
  );
}
