"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogSurface } from "@/components/ui/Dialog";
import { importProductsCsv } from "../import-client";
import type { ImportJob, RowError } from "../types";

type DialogState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "validating" }
  | { phase: "inserting" }
  | { phase: "completed"; job: ImportJob }
  | { phase: "error"; message: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductCsvImportDialog({ open, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<DialogState>({ phase: "idle" });

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setState({ phase: "idle" });
      return;
    }
    setFile(f);
    setState({ phase: "idle" });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = useCallback(async () => {
    if (!file) return;

    setState({ phase: "uploading" });

    try {
      const job = await importProductsCsv(file);

      if (job.status === "completed") {
        setState({ phase: "completed", job });
        if (job.imported_count > 0 && job.error_count === 0) {
          onSuccess();
        }
      } else {
        setState({ phase: "error", message: "La importacion no se completo en el tiempo esperado." });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado al importar.";
      setState({ phase: "error", message });
    }
  }, [file, onSuccess]);

  function reset() {
    setFile(null);
    setState({ phase: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <DialogSurface className="w-full max-w-lg">
        {state.phase === "completed" && state.job.error_count > 0 ? (
          <ErrorResult
            job={state.job}
            filename={state.job.filename}
            onClose={handleClose}
          />
        ) : state.phase === "completed" && state.job.imported_count > 0 ? (
          <SuccessResult
            count={state.job.imported_count}
            onClose={handleClose}
          />
        ) : state.phase === "error" ? (
          <ErrorState message={state.message} onRetry={handleSubmit} onClose={handleClose} />
        ) : state.phase === "uploading" || state.phase === "validating" || state.phase === "inserting" ? (
          <ProcessingResult phase={state.phase} filename={file?.name ?? ""} onCancel={handleClose} />
        ) : (
          <IdleForm
            file={file}
            dragOver={dragOver}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onFileClick={() => inputRef.current?.click()}
            onFileChange={handleInputChange}
            onClear={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
            onSubmit={handleSubmit}
            onClose={handleClose}
            inputRef={inputRef}
          />
        )}
      </DialogSurface>
    </div>
  );
}

function IdleForm({
  file,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileClick,
  onFileChange,
  onClear,
  onSubmit,
  onClose,
  inputRef,
}: {
  file: File | null;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onSubmit: () => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <h2 className="text-lg font-semibold text-text-strong">Importar productos desde CSV</h2>
      <p className="mt-1 text-sm text-text-muted">
        Sube un archivo CSV con los productos a importar.
      </p>

      <div
        className={`mt-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-brand-700 bg-brand-50"
            : "border-app-borderStrong hover:border-brand-700"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onFileClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onFileClick(); }}
      >
        <Upload className="mx-auto h-8 w-8 text-text-disabled" />
        <p className="mt-2 text-sm font-medium text-text-strong">
          Arrastra tu archivo CSV aqui
        </p>
        <p className="mt-1 text-xs text-text-muted">o haz clic para seleccionar archivo</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {file ? (
        <div className="mt-3 flex items-center justify-between rounded-md border border-app-border bg-app-surface-muted px-3 py-2">
          <div className="flex items-center gap-2 truncate">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="truncate text-sm text-text-strong">{file.name}</span>
            <span className="shrink-0 text-xs text-text-muted">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="ml-2 shrink-0 rounded p-1 text-text-muted hover:bg-app-surface hover:text-text-strong"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <a
          href="/api/v1/exports/products.csv"
          className="text-sm text-brand-700 underline underline-offset-2 hover:text-brand-800"
          target="_blank"
          rel="noreferrer"
        >
          Descargar plantilla CSV
        </a>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={!file}>Subir</Button>
        </div>
      </div>
    </>
  );
}

function ErrorState({ message, onRetry, onClose }: { message: string; onRetry: () => void; onClose: () => void }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-text-strong">Error al importar</h2>
      <div className="mt-2">
        <Alert variant="error">{message}</Alert>
      </div>
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button onClick={onRetry}>Reintentar</Button>
      </div>
    </>
  );
}

function ProcessingResult({
  phase,
  filename,
  onCancel,
}: {
  phase: "uploading" | "validating" | "inserting";
  filename: string;
  onCancel: () => void;
}) {
  const labels: Record<string, string> = {
    uploading: "Subiendo archivo...",
    validating: "Validando filas...",
    inserting: "Importando productos...",
  };

  return (
    <>
      <div className="flex flex-col items-center py-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-700" />
        <h2 className="mt-4 text-lg font-semibold text-text-strong">
          Importando productos...
        </h2>
        <p className="mt-2 text-sm text-text-muted">{labels[phase]}</p>
        <p className="mt-1 text-xs text-text-muted">{filename}</p>
      </div>
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </>
  );
}

function SuccessResult({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <>
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-status-success" />
        <h2 className="mt-4 text-lg font-semibold text-text-strong">
          Importacion completada
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {count} {count === 1 ? "producto importado" : "productos importados"}
        </p>
      </div>
      <div className="mt-4 flex justify-center">
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </>
  );
}

function ErrorResult({ job, filename, onClose }: { job: ImportJob; filename: string; onClose: () => void }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" />
        <div>
          <h2 className="text-lg font-semibold text-text-strong">Error al importar productos</h2>
          <p className="mt-1 text-sm text-text-muted">
            Se encontraron {job.error_count} {job.error_count === 1 ? "error" : "errores"}.
            Ningun producto fue importado.
          </p>
          <p className="text-xs text-text-muted">
            Corrige el archivo e intenta de nuevo.
          </p>
        </div>
      </div>

      <div className="mt-4 max-h-56 overflow-y-auto rounded-md border border-app-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-app-border bg-app-surface-muted text-xs uppercase text-text-muted">
              <th className="px-3 py-2 font-medium">Fila</th>
              <th className="px-3 py-2 font-medium">Campo</th>
              <th className="px-3 py-2 font-medium">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {job.errors.map((err: RowError, i: number) => (
              <tr key={i} className="border-b border-app-border last:border-0">
                <td className="px-3 py-2 text-text-muted">{err.row}</td>
                <td className="px-3 py-2 font-medium text-text-strong">{err.field}</td>
                <td className="px-3 py-2 text-text-body">{err.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => downloadErrors(job.errors, filename)}
          className="text-sm text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          Descargar errores
        </button>
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </>
  );
}

function downloadErrors(errors: RowError[], originalFilename: string) {
  const headers = ["row", "field", "message"];
  const csvContent = [
    headers.join(","),
    ...errors.map((e) =>
      [e.row, e.field, `"${e.message.replace(/"/g, '""')}"`].join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `errores-${originalFilename.replace(/\.csv$/i, "")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
