"use client";

import { type FormEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { submitContactLeadAction } from "../actions";
import { INITIAL_CONTACT_FORM_STATE } from "../types";
import type { ContactFormState } from "../types";

export function ContactForm() {
  const [state, setState] = useState<ContactFormState>(INITIAL_CONTACT_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("source_page", pathname || "/contacto");
      const nextState = await submitContactLeadAction(INITIAL_CONTACT_FORM_STATE, formData);
      setState(nextState);

      if (nextState.ok) {
        toast.success(nextState.message);
        formRef.current?.reset();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo enviar tu mensaje");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar tu mensaje.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      {/* Honeypot anti-spam: invisible para personas, visible para bots simples. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">No completar este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Tu nombre" error={fieldErrors.name}>
          <Input id="name" name="name" required maxLength={150} placeholder="Ej. Maria Perez" disabled={isSubmitting} />
        </Field>
        <Field name="phone" label="Telefono / WhatsApp" error={fieldErrors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            maxLength={30}
            placeholder="Ej. 70000000"
            disabled={isSubmitting}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="store_name" label="Nombre de tu negocio (opcional)" error={fieldErrors.storeName}>
          <Input id="store_name" name="store_name" maxLength={150} placeholder="Ej. Tienda Don Mario" disabled={isSubmitting} />
        </Field>
        <Field name="email" label="Correo (opcional)" error={fieldErrors.email}>
          <Input id="email" name="email" type="email" maxLength={255} placeholder="tucorreo@ejemplo.com" disabled={isSubmitting} />
        </Field>
      </div>

      <Field name="business_type" label="Tipo de negocio (opcional)" error={fieldErrors.businessType}>
        <Input
          id="business_type"
          name="business_type"
          maxLength={100}
          placeholder="Ej. Tienda de barrio, ferreteria, almacen"
          disabled={isSubmitting}
        />
      </Field>

      <Field name="message" label="Cuentanos que necesitas (opcional)" error={fieldErrors.message}>
        <Textarea
          id="message"
          name="message"
          maxLength={1000}
          rows={4}
          placeholder="Ej. Tengo 3 sucursales y quiero controlar el stock de todas"
          disabled={isSubmitting}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Enviando..." : "Enviar y solicitar demo"}
      </Button>
      <p className="text-xs text-text-muted">
        Al enviar este formulario aceptas que te contactemos por WhatsApp, telefono o correo. Ver{" "}
        <a href="/legal/privacidad" className="underline hover:text-text-body">
          politica de privacidad
        </a>
        .
      </p>
    </form>
  );
}
