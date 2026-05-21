"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validateImportUpload } from "../schemas";
import type { InventoryImport } from "../types";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; filename: string }
  | { status: "error"; message: string };

export function ImportUploadPanel() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, startTransition] = useTransition();

  async function submitUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateImportUpload(selectedFile);
    if (error || !selectedFile) {
      setState({ status: "error", message: error ?? "Selecciona una imagen" });
      return;
    }

    setState({ status: "uploading", filename: selectedFile.name });
    const formData = new FormData();
    formData.set("file", selectedFile);

    try {
      const response = await fetch("/api/inventory-imports/from-photo", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as Partial<InventoryImport> & { message?: string };
      if (!response.ok || !payload.id) {
        setState({ status: "error", message: payload.message ?? "No se pudo subir la imagen" });
        return;
      }

      startTransition(() => {
        router.push(`/dashboard/imports/${payload.id}`);
        router.refresh();
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo subir la imagen",
      });
    }
  }

  return (
    <form onSubmit={submitUpload} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Upload image</h2>
        <p className="mt-1 text-sm text-slate-600">
          Usa una imagen JPG, PNG o WebP de hasta 8 MB.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          aria-label="Imagen para Import Image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null);
            setState({ status: "idle" });
          }}
        />
        <Button type="submit" disabled={state.status === "uploading"}>
          <Upload className="h-4 w-4" aria-hidden />
          {state.status === "uploading" ? "Subiendo" : "Procesar imagen"}
        </Button>
      </div>
      {state.status === "uploading" ? (
        <Alert>Procesando {state.filename}. El OCR puede tardar unos segundos.</Alert>
      ) : null}
      {state.status === "error" ? <Alert variant="error">{state.message}</Alert> : null}
    </form>
  );
}
