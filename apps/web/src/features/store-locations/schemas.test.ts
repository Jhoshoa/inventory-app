import { describe, expect, it } from "vitest";
import { formDataToStoreLocationValues, locationConflictField, storeLocationPayload, validateStoreLocation } from "./schemas";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("store location schemas", () => {
  it("normalizes spaces and sends empty parts as null", () => {
    const values = formDataToStoreLocationValues(form({ zone: "  Pasillo   2 ", shelf: " ", level: "" }));
    expect(values).toEqual({ zone: "Pasillo 2", shelf: "", level: "" });
    expect(storeLocationPayload(values)).toEqual({ zone: "Pasillo 2", shelf: null, level: null });
  });

  it("requires a zone and a shelf before a level", () => {
    expect(validateStoreLocation({ zone: "", shelf: "", level: "" }).zone).toMatch(/Escribe la zona/);
    expect(validateStoreLocation({ zone: "Deposito", shelf: "", level: "2" }).level).toMatch(/estante/);
    expect(validateStoreLocation({ zone: "Deposito", shelf: "Rack A", level: "2" })).toEqual({});
    expect(validateStoreLocation({ zone: "x".repeat(51), shelf: "", level: "" }).zone).toMatch(/50/);
  });

  it("puts a repeated place on the zone field", () => {
    expect(locationConflictField("Ya existe la ubicacion 'Heladera'")).toEqual({ zone: "Ese lugar ya existe." });
    expect(locationConflictField("La tienda ya tiene 300 ubicaciones")).toEqual({});
  });
});
