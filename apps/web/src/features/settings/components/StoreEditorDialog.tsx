"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { StoreResponse } from "@/features/settings/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { updateStoreAction } from "../actions";
import type { StoreEditorState } from "../types";

const initialStoreEditorState: StoreEditorState = {
  ok: false,
  message: "",
  fieldErrors: {},
};

export function StoreEditorDialog({ storeData }: { storeData: StoreResponse }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StoreEditorState>(initialStoreEditorState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialStoreEditorState);
    try {
      const nextState = await updateStoreAction(initialStoreEditorState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success(nextState.message);
        setOpen(false);
        router.refresh();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo actualizar la tienda");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la tienda.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Editar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle close>Editar datos de tienda</DialogTitle>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="store-name">Nombre de la tienda</Label>
                <Input
                  id="store-name"
                  name="name"
                  defaultValue={storeData.name}
                  maxLength={100}
                  required
                />
                <FieldError message={fieldErrors.name} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-address">Direccion</Label>
                <Input
                  id="store-address"
                  name="address"
                  defaultValue={storeData.address ?? ""}
                  maxLength={255}
                />
                <FieldError message={fieldErrors.address} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-phone">Telefono</Label>
                <Input
                  id="store-phone"
                  name="phone"
                  type="tel"
                  defaultValue={storeData.phone ?? ""}
                  maxLength={20}
                />
                <FieldError message={fieldErrors.phone} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
