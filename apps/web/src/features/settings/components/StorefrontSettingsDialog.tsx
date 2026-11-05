"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import type { StoreResponse } from "@/features/settings/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";
import { Textarea } from "@/components/ui/Textarea";
import { updateStorefrontAction } from "../actions";
import { STORE_IMAGE_KINDS, StoreImageUploader, StorePaymentQrUploader } from "./StoreImageUploader";
import type { StorefrontState } from "../types";

const initialState: StorefrontState = { ok: false, message: "", fieldErrors: {} };

function storefrontUrl(slug: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  return `${base}/t/${slug}`;
}

export function StorefrontSettingsDialog({ storeData }: { storeData: StoreResponse }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StorefrontState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState(storeData.storefront_enabled);
  const [slug, setSlug] = useState(storeData.storefront_slug ?? "");
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialState);
    try {
      const nextState = await updateStorefrontAction(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success(nextState.message);
        setOpen(false);
        router.refresh();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo actualizar el catalogo publico");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el catalogo publico.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storefrontUrl(slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <StoreIcon className="h-4 w-4" aria-hidden="true" />
        Catalogo publico
      </Button>
      <Dialog open={open} onOpenChange={(next) => !isSubmitting && setOpen(next)} size="lg">
        <DialogTitle close={!isSubmitting}>Catalogo publico</DialogTitle>
        <form onSubmit={onSubmit} noValidate className="contents">
          <DialogBody>
            <div className="space-y-5">
              <p className="text-sm text-text-muted">
                Comparte un link donde tus clientes ven tus productos, precios y disponibilidad. Sin
                login, sin carrito — solo un catalogo de consulta con botón de WhatsApp.
              </p>

              <div className="flex items-center gap-2">
                <input
                  id="storefront-enabled"
                  name="storefront_enabled"
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-app-borderStrong"
                />
                <Label htmlFor="storefront-enabled">Activar catalogo publico</Label>
              </div>

              <div className="space-y-1">
                <Label htmlFor="storefront-slug">Direccion del catalogo</Label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-text-muted">{storefrontUrl("")}</span>
                  <Input
                    id="storefront-slug"
                    name="storefront_slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="mi-tienda"
                    maxLength={60}
                  />
                </div>
                <FieldError message={fieldErrors.slug} />
                {slug ? (
                  <button
                    type="button"
                    onClick={copyLink}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent-primary hover:text-accent-primary-hover"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar enlace"}
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="storefront-color-primary">Color primario</Label>
                  <Input
                    id="storefront-color-primary"
                    name="storefront_color_primary"
                    type="text"
                    defaultValue={storeData.storefront_color_primary ?? ""}
                    placeholder="#2563EB"
                    maxLength={7}
                  />
                  <FieldError message={fieldErrors.colorPrimary} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="storefront-color-secondary">Color secundario</Label>
                  <Input
                    id="storefront-color-secondary"
                    name="storefront_color_secondary"
                    type="text"
                    defaultValue={storeData.storefront_color_secondary ?? ""}
                    placeholder="#1E293B"
                    maxLength={7}
                  />
                  <FieldError message={fieldErrors.colorSecondary} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                <StoreImageUploader
                  kind={STORE_IMAGE_KINDS.logo}
                  currentUrl={storeData.storefront_logo_url}
                  onChange={() => router.refresh()}
                />
                <StoreImageUploader
                  kind={STORE_IMAGE_KINDS.banner}
                  currentUrl={storeData.storefront_banner_url}
                  onChange={() => router.refresh()}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="storefront-description">Descripcion corta</Label>
                <Input
                  id="storefront-description"
                  name="storefront_description"
                  defaultValue={storeData.storefront_description ?? ""}
                  placeholder="Ferreteria de barrio con mas de 10 anos de experiencia"
                  maxLength={280}
                />
                <FieldError message={fieldErrors.description} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="storefront-whatsapp">WhatsApp de contacto</Label>
                <PhoneCountryInput
                  id="storefront-whatsapp"
                  name="storefront_whatsapp"
                  defaultValue={storeData.storefront_whatsapp ?? storeData.phone}
                  placeholder="Numero sin el codigo de pais"
                />
                <FieldError message={fieldErrors.whatsapp} />
                <p className="text-xs text-text-muted">
                  Elige el pais y escribe el numero como lo marcas alli. Los clientes te escriben a este
                  numero desde el catalogo.
                </p>
              </div>

              <div className="space-y-3 border-t border-app-border pt-4">
                <div>
                  <p className="text-sm font-medium text-text-strong">Pago con QR (opcional)</p>
                  <p className="text-xs text-text-muted">
                    Sube el QR que ya usas para cobrar (AloKe, ZAS, tu banco, lo que sea). Se lo mostramos
                    al cliente cuando te solicita un producto — vos confirmas el pago a mano cuando te
                    llegue, no procesamos ningun cobro.
                  </p>
                </div>
                <StorePaymentQrUploader currentUrl={storeData.storefront_payment_qr_url} onChange={() => router.refresh()} />
                <div className="space-y-1">
                  <Label htmlFor="storefront-payment-instructions">Instrucciones para el cliente</Label>
                  <Textarea
                    id="storefront-payment-instructions"
                    name="storefront_payment_instructions"
                    defaultValue={storeData.storefront_payment_instructions ?? ""}
                    placeholder="Ej. Paga con este QR y enviame el comprobante por WhatsApp"
                    maxLength={280}
                    rows={2}
                  />
                  <FieldError message={fieldErrors.paymentInstructions} />
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isSubmitting}>
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
