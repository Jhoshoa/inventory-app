"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { requestCheckoutAction } from "../actions";
import { BRAND, whatsappHref } from "@/lib/brand";

export function PaymentRequestButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await requestCheckoutAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const message = [
        `Hola, soy el dueño de ${result.storeName} en ${BRAND.name}.`,
        result.billingNit ? `NIT: ${result.billingNit}.` : null,
        `Quiero coordinar el pago de mi plan (estado actual: ${result.subscriptionStatus}).`,
      ]
        .filter(Boolean)
        .join(" ");

      toast.success("Solicitud registrada. Abrimos WhatsApp para coordinar el pago.");
      window.open(whatsappHref(message), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la solicitud de pago");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="primary" onClick={handleClick} disabled={isSubmitting}>
      {isSubmitting ? "Abriendo WhatsApp…" : "Pagar por WhatsApp"}
    </Button>
  );
}
