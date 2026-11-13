import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importProductsCsv } from "../import-client";
import type { ImportJob } from "../types";
import { ProductCsvImportDialog } from "./ProductCsvImportDialog";

vi.mock("../import-client", () => ({ importProductsCsv: vi.fn() }));
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: (...args: unknown[]) => toastSuccess(...args), error: vi.fn() }) }));

function csv(name: string, content = "name,price,stock\nLeche,7.50,3\nPan,1,10\n") {
  return new File([content], name, { type: "text/csv" });
}

function job(overrides: Partial<ImportJob>): ImportJob {
  return {
    id: "j-1",
    status: "completed",
    total_rows: 2,
    imported_count: 0,
    error_count: 0,
    errors: [],
    filename: "productos.csv",
    created_at: "",
    completed_at: "",
    ...overrides,
  };
}

function choose(file: File) {
  fireEvent.change(screen.getByLabelText("Archivo CSV"), { target: { files: [file] } });
}

describe("ProductCsvImportDialog", () => {
  beforeEach(() => {
    vi.mocked(importProductsCsv).mockReset();
    toastSuccess.mockReset();
  });

  it("rejects a file that is not .csv", async () => {
    render(<ProductCsvImportDialog open onClose={vi.fn()} onSuccess={vi.fn()} />);
    choose(new File(["x"], "productos.xlsx"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Selecciona un archivo con extensión .csv");
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
  });

  it("counts the rows and imports, saying how many were created", async () => {
    vi.mocked(importProductsCsv).mockResolvedValue(job({ imported_count: 2 }));
    const onSuccess = vi.fn();
    render(<ProductCsvImportDialog open onClose={vi.fn()} onSuccess={onSuccess} />);
    choose(csv("productos.csv"));
    expect(await screen.findByText(/2 filas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(2));
    expect(toastSuccess).toHaveBeenCalledWith("Se importaron 2 productos");
  });

  it("lists the errors when nothing was imported", async () => {
    vi.mocked(importProductsCsv).mockResolvedValue(
      job({
        error_count: 2,
        errors: [
          { row: 12, field: "price", message: "El precio debe ser mayor a 0" },
          { row: 40, field: "vence", message: "vence debe ser una fecha valida (AAAA-MM-DD o DD/MM/AAAA)" },
        ],
      }),
    );
    render(<ProductCsvImportDialog open onClose={vi.fn()} onSuccess={vi.fn()} />);
    choose(csv("productos.csv"));
    await screen.findByText(/2 filas/);
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByText("No se importó ningún producto")).toBeInTheDocument();
    expect(screen.getByText(/Hay 2 errores\. Corrígelos y vuelve a subir el archivo: se importa todo o nada\./)).toBeInTheDocument();
    const table = screen.getByRole("table");
    // La fila de la planilla: la API cuenta desde el primer producto.
    expect(within(table).getByText("13")).toBeInTheDocument();
    expect(within(table).getByText("El precio debe ser mayor a 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar errores" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Subir otro archivo" }));
    expect(screen.getByText("Arrastra tu archivo aquí")).toBeInTheDocument();
  });

  it("shows the problem and lets you retry when the upload fails", async () => {
    vi.mocked(importProductsCsv).mockRejectedValueOnce(new Error("Solo se aceptan archivos CSV"));
    render(<ProductCsvImportDialog open onClose={vi.fn()} onSuccess={vi.fn()} />);
    choose(csv("productos.csv"));
    await screen.findByText(/2 filas/);
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Solo se aceptan archivos CSV");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("an empty file cannot be imported", async () => {
    render(<ProductCsvImportDialog open onClose={vi.fn()} onSuccess={vi.fn()} />);
    choose(csv("vacio.csv", "name,price,stock\n"));
    expect(await screen.findByRole("alert")).toHaveTextContent("El archivo no tiene filas con productos.");
  });
});
