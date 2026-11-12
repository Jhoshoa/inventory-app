"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { importProductsCsv } from "../import-client";
import {
  checkImportFile,
  countCsvRows,
  downloadText,
  IMPORT_MAX_ROWS,
  importErrorsCsv,
  importTemplateCsv,
  readFileText,
  spreadsheetRow,
} from "../import-template";
import type { ImportJob } from "../types";

/** Si en este tiempo no hay respuesta, aparece "Reintentar" (tablero P05). */
const SLOW_IMPORT_MS = 60_000;

type Phase =
  | { name: "choose" }
  | { name: "working" }
  | { name: "rejected"; job: ImportJob }
  | { name: "failed"; message: string };

/**
 * Importar productos desde CSV (tablero P05): elegir archivo → validando → resultado.
 * Todo o nada: si una fila falla no se crea ninguno y se listan fila, campo y motivo.
 */
export function ProductCsvImportDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  /** Se llama con la cantidad importada (la ventana ya avisó "Se importaron N productos"). */
  onSuccess: (count: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "choose" });
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (phase.name !== "working") return;
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), SLOW_IMPORT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function choose(next: File) {
    const problem = checkImportFile(next);
    setFile(problem ? null : next);
    setRows(null);
    setFileError(problem);
    setPhase({ name: "choose" });
    if (problem) return;
    let count: number;
    try {
      count = countCsvRows(await readFileText(next));
    } catch {
      setFile(null);
      setFileError("No se pudo leer el archivo. Prueba de nuevo o guárdalo otra vez como CSV.");
      return;
    }
    setRows(count);
    if (count === 0) setFileError("El archivo no tiene filas con productos.");
    else if (count > IMPORT_MAX_ROWS) setFileError(`El archivo tiene ${count.toLocaleString("es-BO")} filas: el máximo es 5.000.`);
  }

  async function start() {
    if (!file || fileError) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ name: "working" });
    try {
      const job = await importProductsCsv(file, controller.signal);
      if (controller.signal.aborted) return;
      if (job.status === "completed" && job.error_count === 0 && job.imported_count > 0) {
        toast.success(job.imported_count === 1 ? "Se importó 1 producto" : `Se importaron ${job.imported_count} productos`);
        reset();
        onSuccess(job.imported_count);
      } else if (job.status === "completed") {
        setPhase({ name: "rejected", job });
      } else {
        setPhase({ name: "failed", message: "La importación no terminó a tiempo. Intenta de nuevo." });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase({
        name: "failed",
        message: error instanceof Error ? error.message : "No se pudo importar. Revisa tu conexión e intenta de nuevo.",
      });
    }
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setRows(null);
    setFileError(null);
    setPhase({ name: "choose" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  const working = phase.name === "working";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !working && close()} position="sheet" size="lg">
      <DialogTitle close={!working}>Importar productos desde CSV</DialogTitle>

      {phase.name === "working" ? (
        <DialogBody className="!pb-5">
          <div className="flex flex-col items-center py-6 text-center" role="status">
            <Loader2 className="h-10 w-10 animate-spin text-brand-700" aria-hidden="true" />
            <p className="mt-4 text-lg font-bold text-text-strong">Validando filas…</p>
            <p className="mt-1 text-sm text-text-muted">
              {file?.name}
              {rows !== null ? ` · ${rows.toLocaleString("es-BO")} ${rows === 1 ? "fila" : "filas"}` : ""}
            </p>
            <p className="mt-3 max-w-sm text-xs text-text-muted">No cierres esta ventana. Si nada cambia en 1 minuto, aparece &quot;Reintentar&quot;.</p>
            {slow ? (
              <Button className="mt-4" variant="secondary" onClick={() => void start()}>
                Reintentar
              </Button>
            ) : null}
          </div>
        </DialogBody>
      ) : phase.name === "rejected" ? (
        <>
          <DialogBody className="space-y-3">
            <div className="flex items-start gap-3" role="alert">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" aria-hidden="true" />
              <div>
                <p className="font-bold text-text-strong">No se importó ningún producto</p>
                <p className="text-sm text-text-muted">
                  Hay {phase.job.error_count === 1 ? "1 error" : `${phase.job.error_count} errores`}. Corrígelos y vuelve a subir el
                  archivo: se importa todo o nada.
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted">La fila es la de la planilla (la 1 son los títulos).</p>
            <div className="max-h-64 overflow-y-auto rounded-control border border-app-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-app-surface-muted text-xs font-semibold text-text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">Fila</th>
                    <th scope="col" className="px-3 py-2">Campo</th>
                    <th scope="col" className="px-3 py-2">Qué pasa</th>
                  </tr>
                </thead>
                <tbody>
                  {phase.job.errors.map((error, index) => (
                    <tr key={`${error.row}-${error.field}-${index}`} className="border-t border-app-border">
                      <td className="px-3 py-2 tabular-nums text-text-muted">{spreadsheetRow(error.row) ?? "Archivo"}</td>
                      <td className="px-3 py-2 font-mono text-text-strong">{error.field}</td>
                      <td className="px-3 py-2 text-text-body">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogBody>
          <DialogFooter align="between" className="flex-wrap">
            <Button
              variant="ghost"
              onClick={() =>
                downloadText(importErrorsCsv(phase.job.errors), `errores-${phase.job.filename.replace(/\.csv$/i, "") || "importacion"}.csv`)
              }
            >
              Descargar errores
            </Button>
            <Button onClick={reset}>Subir otro archivo</Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <DialogBody className="space-y-3">
            {phase.name === "failed" ? (
              <p role="alert" className="rounded-control border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
                {phase.message}
              </p>
            ) : null}
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const dropped = event.dataTransfer.files[0];
                if (dropped) void choose(dropped);
              }}
              className={`flex flex-col items-center gap-2 rounded-card border-2 border-dashed px-4 py-6 text-center ${
                dragOver ? "border-brand-700 bg-brand-50" : "border-app-borderStrong"
              }`}
            >
              <Upload className="h-7 w-7 text-text-muted" aria-hidden="true" />
              <p className="text-sm font-bold text-text-strong">Arrastra tu archivo aquí</p>
              <p className="text-xs text-text-muted">o</p>
              <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                Elegir archivo
              </Button>
              <p className="text-xs text-text-muted">.csv · hasta 5 MB · hasta 5.000 filas</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                aria-label="Archivo CSV"
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  if (chosen) void choose(chosen);
                }}
              />
            </div>

            {fileError ? (
              <p role="alert" className="text-sm text-status-danger">
                {fileError}
              </p>
            ) : null}
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-control border border-app-border bg-app-surface-muted px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="truncate font-semibold text-text-strong">{file.name}</span>
                  <span className="shrink-0 text-xs text-text-muted">
                    {rows === null ? "" : `${rows.toLocaleString("es-BO")} ${rows === 1 ? "fila" : "filas"} · `}
                    {Math.max(1, Math.round(file.size / 1024))} KB
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Quitar archivo"
                  onClick={reset}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-muted hover:bg-app-surface"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <p className="text-xs text-text-muted">
              Columnas: <code className="font-mono">name, price, stock</code> (obligatorias) y opcionales{" "}
              <code className="font-mono">category</code> o <code className="font-mono">category_id</code>,{" "}
              <code className="font-mono">sku, unit, min_stock, cost_price, qr_code, photo_url, vence, aviso_dias</code>. Precio con
              punto (7.50). <code className="font-mono">vence</code> como 31/12/2026; <code className="font-mono">aviso_dias</code> vacío
              usa el aviso de la tienda.
            </p>
          </DialogBody>
          <DialogFooter align="between" className="flex-wrap">
            <Button variant="ghost" onClick={() => downloadText(importTemplateCsv(), "plantilla-productos.csv")}>
              Descargar plantilla
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={close}>
                Cancelar
              </Button>
              <Button onClick={() => void start()} disabled={!file || Boolean(fileError) || rows === null}>
                {phase.name === "failed" ? "Reintentar" : "Importar"}
              </Button>
            </div>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
