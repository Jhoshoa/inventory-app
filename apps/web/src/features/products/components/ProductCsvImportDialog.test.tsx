import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCsvImportDialog } from "./ProductCsvImportDialog";

vi.mock("../import-client", () => ({
  importProductsCsv: vi.fn(),
}));

function buildFile(name: string, content = "a,b,c") {
  return new File([content], name, { type: "text/plain" });
}

function dropFile(dropzone: Element, file: File) {
  fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
}

describe("ProductCsvImportDialog", () => {
  it("shows an error instead of silently ignoring a non-csv file dropped on the dropzone", () => {
    render(<ProductCsvImportDialog open onClose={() => {}} onSuccess={() => {}} />);

    const dropzone = screen.getByRole("button", { name: /Arrastra tu archivo CSV aqui/ });
    dropFile(dropzone, buildFile("productos.xlsx"));

    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona un archivo con extension .csv");
    expect(screen.getByRole("button", { name: "Subir" })).toBeDisabled();
  });

  it("clears the file error once a valid csv is dropped", () => {
    render(<ProductCsvImportDialog open onClose={() => {}} onSuccess={() => {}} />);

    const dropzone = screen.getByRole("button", { name: /Arrastra tu archivo CSV aqui/ });
    dropFile(dropzone, buildFile("productos.xlsx"));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    dropFile(dropzone, buildFile("productos.csv"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled();
  });
});
