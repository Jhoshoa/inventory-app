import { describe, expect, it } from "vitest";
import { checkImportFile, countCsvRows, importErrorsCsv, importTemplateCsv, IMPORT_COLUMNS } from "./import-template";
import { sheetCount, validateMargin } from "./label-settings";

describe("CSV import helpers", () => {
  it("checks the file before uploading", () => {
    expect(checkImportFile({ name: "p.xlsx", size: 10 })).toMatch(/\.csv/);
    expect(checkImportFile({ name: "p.CSV", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(checkImportFile({ name: "p.csv", size: 0 })).toMatch(/vacío/);
    expect(checkImportFile({ name: "p.csv", size: 100 })).toBeNull();
  });

  it("counts data rows, without header or blank lines", () => {
    expect(countCsvRows("\uFEFFname,price,stock\r\nA,1,1\r\n\r\nB,2,2\n")).toBe(2);
    expect(countCsvRows("name,price,stock\n")).toBe(0);
  });

  it("the template has exactly the importer columns and an example", () => {
    const [header, example] = importTemplateCsv(new Date(2026, 10, 12)).replace("\uFEFF", "").trim().split("\n");
    expect(header.split(",")).toEqual([...IMPORT_COLUMNS]);
    expect(example).toContain("Leche Pil 1l,7.50,24");
    expect(example).toContain("11/01/2027");
  });

  it("errors download quotes commas", () => {
    expect(importErrorsCsv([{ row: 3, field: "name", message: "Falta, el nombre" }])).toContain('4,name,"Falta, el nombre"');
  });
});

describe("label helpers", () => {
  it("validates the margin and counts sheets", () => {
    expect(validateMargin("")).toBeNull();
    expect(validateMargin("8,5")).toBeNull();
    expect(validateMargin("31")).toMatch(/0 a 30/);
    expect(validateMargin("abc")).toMatch(/0 a 30/);
    expect(sheetCount(24, 32)).toBe(1);
    expect(sheetCount(33, 32)).toBe(2);
    expect(sheetCount(5, 0)).toBe(0);
  });
});
