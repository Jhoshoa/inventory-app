"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { StoreDayActionState } from "../types";

type Action = (state: StoreDayActionState, formData: FormData) => Promise<StoreDayActionState>;

const EMPTY: StoreDayActionState = { ok: false, fieldErrors: {} };

/**
 * Envía una acción de caja desde un formulario: bloquea el botón mientras se
 * envía (no se manda dos veces), deja los errores en su campo y el error
 * general dentro de la ventana, sin perder lo escrito (reglas 3.1–3.3 del plan).
 */
export function useStoreDayAction(action: Action, onDone: (state: StoreDayActionState) => void) {
  const [state, setState] = useState<StoreDayActionState>(EMPTY);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    if (pending) return;
    setPending(true);
    try {
      const next = await action(EMPTY, formData);
      setState(next);
      if (next.ok) {
        if (next.message) toast.success(next.message);
        onDone(next);
      }
    } catch (error) {
      setState({
        ok: false,
        fieldErrors: {},
        message: error instanceof Error ? error.message : "No se pudo completar. Revisa tu conexión e intenta de nuevo.",
      });
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setState(EMPTY);
  }

  return { state, pending, submit, reset };
}
