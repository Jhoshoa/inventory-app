"use client";

import { type FormEvent, useRef, useState } from "react";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createStorefrontRequestAction } from "../requestActions";
import { INITIAL_STOREFRONT_REQUEST_STATE } from "../requestTypes";
import type { StorefrontRequestState } from "../requestTypes";

export function StorefrontRequestDialog({
  slug,
  productId,
  productName,
}: {
  slug: string;
  productId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StorefrontRequestState>(INITIAL_STOREFRONT_REQUEST_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      const nextState = await createStorefrontRequestAction(slug, productId, INITIAL_STOREFRONT_REQUEST_STATE, formData);
      setState(nextState);
      if (nextState.ok) {
        toast.success(nextState.message);
        setSent(true);
        formRef.current?.reset();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar tu solicitud.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSent(false);
      setState(INITIAL_STOREFRONT_REQUEST_STATE);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <PackageCheck className="h-4 w-4" aria-hidden="true" />
        Solicitar
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange} size="sm">
        <DialogTitle close>Solicitar &quot;{productName}&quot;</DialogTitle>
        {sent ? (
          <DialogBody>
            <p className="py-4 text-center text-sm text-text-body">
              Listo, dejamos tu pedido registrado. La tienda te va a contactar pronto para coordinar la compra.
            </p>
          </DialogBody>
        ) : (
          <form ref={formRef} onSubmit={onSubmit} noValidate className="contents">
            <DialogDescription>
              Dejanos tus datos y la tienda te contacta para coordinar la compra — no es una compra en linea, es
              como hablar con ellos directamente.
            </DialogDescription>
            <DialogBody>
              <div className="space-y-4">
                <Field name="customer_name" label="Tu nombre" error={fieldErrors.customerName}>
                  <Input id="customer_name" name="customer_name" required maxLength={150} disabled={isSubmitting} />
                </Field>
                <Field name="customer_phone" label="Tu telefono / WhatsApp" error={fieldErrors.customerPhone}>
                  <Input
                    id="customer_phone"
                    name="customer_phone"
                    type="tel"
                    required
                    maxLength={30}
                    placeholder="Ej. 70000000"
                    disabled={isSubmitting}
                  />
                </Field>
                <Field name="note" label="Nota (opcional)" error={fieldErrors.note}>
                  <Textarea
                    id="note"
                    name="note"
                    maxLength={500}
                    rows={3}
                    placeholder="Ej. Cuantas unidades necesitas, cuando pasarias a recogerlo..."
                    disabled={isSubmitting}
                  />
                </Field>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </>
  );
}
