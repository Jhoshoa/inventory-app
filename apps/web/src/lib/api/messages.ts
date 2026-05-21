import type { ApiError } from "./errors";

export function userMessageForApiError(error: ApiError): string {
  if (error.code === "unauthorized") {
    return "Tu sesion expiro. Inicia sesion nuevamente.";
  }
  if (error.code === "forbidden") {
    return "No tienes permiso para esta accion. Requiere rol owner.";
  }
  if (error.code === "not_found") {
    return "El recurso solicitado no existe o ya no esta disponible.";
  }
  if (error.code === "conflict") {
    return error.message || "La operacion no se puede completar por el estado actual.";
  }
  if (error.code === "validation_error") {
    return "Revisa los campos e intenta nuevamente.";
  }
  if (error.code === "network_error") {
    return "No se pudo conectar con el backend. Revisa la conexion o intenta mas tarde.";
  }
  if (error.code === "server_error") {
    return "El servidor no pudo completar la operacion. Intenta mas tarde.";
  }
  return error.message || "No se pudo completar la operacion.";
}
