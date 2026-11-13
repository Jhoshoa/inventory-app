import { LOCATION_LIMITS, type StoreLocationActionState } from "./types";

export interface StoreLocationValues {
  zone: string;
  shelf: string;
  level: string;
}

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function formDataToStoreLocationValues(formData: FormData): StoreLocationValues {
  return { zone: clean(formData.get("zone")), shelf: clean(formData.get("shelf")), level: clean(formData.get("level")) };
}

export function validateStoreLocation(values: StoreLocationValues): StoreLocationActionState["fieldErrors"] {
  const errors: StoreLocationActionState["fieldErrors"] = {};
  if (!values.zone) errors.zone = "Escribe la zona (pasillo, heladera, depósito…)";
  else if (values.zone.length > LOCATION_LIMITS.zone) errors.zone = `Máximo ${LOCATION_LIMITS.zone} caracteres`;
  if (values.shelf.length > LOCATION_LIMITS.shelf) errors.shelf = `Máximo ${LOCATION_LIMITS.shelf} caracteres`;
  if (values.level.length > LOCATION_LIMITS.level) errors.level = `Máximo ${LOCATION_LIMITS.level} caracteres`;
  else if (values.level && !values.shelf) errors.level = "Para poner un nivel, primero escribe el estante";
  return errors;
}

/** 409 de la API: el lugar ya existe (sin importar mayúsculas). Va en el campo Zona. */
export function locationConflictField(message: string): StoreLocationActionState["fieldErrors"] {
  return message.toLowerCase().includes("ya existe") ? { zone: "Ese lugar ya existe." } : {};
}

export function storeLocationPayload(values: StoreLocationValues) {
  return { zone: values.zone, shelf: values.shelf || null, level: values.level || null };
}

/** Cómo se ve el lugar al vender ("Pasillo 4 · Estante A · 2"), igual que el `label` de la API. */
export function locationLabel(values: StoreLocationValues) {
  return [values.zone, values.shelf, values.level].filter(Boolean).join(" · ");
}
