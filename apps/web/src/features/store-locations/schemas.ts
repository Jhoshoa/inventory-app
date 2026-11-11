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
  if (!values.zone) errors.zone = "La zona es requerida";
  else if (values.zone.length > LOCATION_LIMITS.zone) errors.zone = `Maximo ${LOCATION_LIMITS.zone} caracteres`;
  if (values.shelf.length > LOCATION_LIMITS.shelf) errors.shelf = `Maximo ${LOCATION_LIMITS.shelf} caracteres`;
  if (values.level.length > LOCATION_LIMITS.level) errors.level = `Maximo ${LOCATION_LIMITS.level} caracteres`;
  else if (values.level && !values.shelf) errors.level = "Para indicar un nivel primero indica el mueble";
  return errors;
}

export function storeLocationPayload(values: StoreLocationValues) {
  return { zone: values.zone, shelf: values.shelf || null, level: values.level || null };
}
