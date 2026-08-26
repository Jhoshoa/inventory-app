"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { inviteCashierAction } from "../actions";
import type { InviteCashierState } from "../types";

const initialState: InviteCashierState = {
  ok: false,
  message: "",
  fieldErrors: {},
};

export function InviteCashierForm() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<InviteCashierState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialState);
    try {
      const nextState = await inviteCashierAction(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success(nextState.message);
        if (nextState.devInviteUrl) {
          toast.message("Enlace de invitacion (modo desarrollo)", {
            description: nextState.devInviteUrl,
          });
        }
        setOpen(false);
        router.refresh();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo enviar la invitacion");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar la invitacion.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Invitar cajero
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle close>Invitar a un miembro</DialogTitle>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Enviaremos un enlace de invitacion al correo indicado. La persona invitada podra
                crear su contraseña y acceder con el rol que definas.
              </p>
              <div className="space-y-1">
                <Label htmlFor="invite-email">Correo electronico</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  maxLength={255}
                  error={Boolean(fieldErrors.email)}
                />
                <FieldError message={fieldErrors.email} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="invite-role">Rol</Label>
                <Select id="invite-role" name="role" defaultValue="cashier">
                  <option value="cashier">Cajero</option>
                  <option value="owner">Propietario</option>
                </Select>
                <FieldError message={fieldErrors.role} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar invitacion"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
