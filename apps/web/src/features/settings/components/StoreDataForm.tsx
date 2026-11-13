"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, ReceiptText, Store } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";
import { useUnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { SaleReceipt } from "@/features/sales/components/SaleReceipt";
import type { Sale } from "@/features/sales/types";
import { updateStoreAction } from "../actions";
import { validateStoreForm } from "../schemas";
import { timezoneText } from "../sections";
import type { StoreResponse } from "../types";
import { SettingsCard, SettingsField, UnsavedBar } from "./SettingsField";
import { StoreImageUploader, STORE_IMAGE_KINDS } from "./StoreImageUploader";

const FORM_ID = "store-data-form";

function snapshot(form: HTMLFormElement | null) {
  if (!form) return "";
  return JSON.stringify(Array.from(new FormData(form).entries()));
}

/**
 * Datos de la tienda (tableros A · Datos de la tienda y P12): logo (el mismo del
 * catálogo y del recibo), nombre, dirección, teléfono y zona horaria (solo lectura).
 * Con cambios aparece "Cambios sin guardar · Descartar · Guardar".
 */
export function StoreDataForm({ store }: { store: StoreResponse }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialRef = useRef("");
  const [formKey, setFormKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoUrl, setLogoUrl] = useState(store.storefront_logo_url);
  const [preview, setPreview] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);

  // Lo guardado (el teléfono ya arma su valor al dibujarse): se toma al montar y al descartar.
  useEffect(() => {
    initialRef.current = snapshot(formRef.current);
    setDirty(false);
  }, [formKey, store]);

  const checkDirty = useCallback(() => {
    window.setTimeout(() => setDirty(snapshot(formRef.current) !== initialRef.current), 0);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
    };
    const found = validateStoreForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    setSaving(true);
    try {
      const result = await updateStoreAction({ ok: false, message: "", fieldErrors: {} }, data);
      if (result.ok) {
        toast.success("Guardado");
        initialRef.current = snapshot(formRef.current);
        setDirty(false);
        router.refresh();
      } else {
        setErrors(result.fieldErrors);
        toast.error(result.message || "No se pudo guardar");
      }
    } catch {
      toast.error("No se pudo guardar. Revisa tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  const sample = sampleSale();

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-text-body">Logo de la tienda</p>
          <p className="text-xs text-text-muted">Sale en el recibo y en el catálogo. JPG, PNG o WebP hasta 5 MB.</p>
        </div>
        <StoreImageUploader kind={STORE_IMAGE_KINDS.logo} currentUrl={logoUrl} onChange={setLogoUrl} showLabel={false} />
      </SettingsCard>

      <form key={formKey} id={FORM_ID} ref={formRef} onSubmit={onSubmit} onChange={checkDirty} onInput={checkDirty} noValidate>
        <SettingsCard>
          <SettingsField id="name" label="Nombre de la tienda" error={errors.name}>
            <Input id="name" name="name" defaultValue={store.name} maxLength={100} autoComplete="organization" error={Boolean(errors.name)} />
          </SettingsField>
          <SettingsField id="address" label="Dirección" optional error={errors.address}>
            <Input id="address" name="address" defaultValue={store.address ?? ""} maxLength={255} autoComplete="street-address" error={Boolean(errors.address)} />
          </SettingsField>
          <SettingsField id="phone" label="Teléfono" optional error={errors.phone} hint="Sale en el recibo de cada venta.">
            <PhoneCountryInput id="phone" name="phone" defaultValue={store.phone} error={Boolean(errors.phone)} errorId={errors.phone ? "phone-error" : undefined} />
          </SettingsField>
          <SettingsField id="timezone" label="Zona horaria" hint="Marca cuándo empieza el día para ventas, cierres y vencimientos. No se cambia desde aquí.">
            <Input id="timezone" value={timezoneText(store.timezone)} readOnly disabled aria-readonly="true" />
          </SettingsField>
        </SettingsCard>
      </form>

      <SettingsCard title="Cómo te ven los clientes">
        <ul className="-my-2 divide-y divide-app-border">
          <li>
            <button type="button" onClick={() => setPreview(true)} className="flex min-h-12 w-full items-center gap-3 py-2 text-left">
              <ReceiptText className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text-strong">Recibo de venta</span>
                <span className="block text-xs text-text-muted">Ver cómo se imprime</span>
              </span>
              <ChevronRight className="h-4 w-4 text-text-disabled" aria-hidden="true" />
            </button>
          </li>
          <li>
            <Link href="/dashboard/settings/catalogo" className="flex min-h-12 items-center gap-3 py-2">
              <Store className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text-strong">Catálogo público</span>
                <span className="block text-xs text-text-muted">Colores, WhatsApp y horario</span>
              </span>
              <ChevronRight className="h-4 w-4 text-text-disabled" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </SettingsCard>

      {dirty ? (
        <UnsavedBar
          formId={FORM_ID}
          saving={saving}
          onDiscard={() => {
            setErrors({});
            setFormKey((key) => key + 1);
          }}
        />
      ) : null}

      <Dialog open={preview} onOpenChange={setPreview} position="sheet" size="sm">
        <DialogTitle close>Así se imprime</DialogTitle>
        <DialogBody className="bg-app-surface-muted pb-5">
          <p className="mb-3 text-center text-xs text-text-muted">Ejemplo con los datos guardados de la tienda.</p>
          <SaleReceipt sale={sample} store={{ name: store.name, address: store.address, phone: store.phone, logoUrl }} />
        </DialogBody>
      </Dialog>
      {guard.dialog}
    </div>
  );
}

function sampleSale(): Sale {
  return {
    id: "ejemplo0-0000-0000-0000-000000000000",
    items: [
      { product_id: "a", product_name: "Coca Cola 2l", quantity: 2, unit_price: "14.00", subtotal: "28.00" },
      { product_id: "b", product_name: "Pan de batalla", quantity: 10, unit_price: "0.50", subtotal: "5.00" },
    ],
    subtotal: "33.00",
    discount_type: null,
    discount_value: "0",
    discount_amount: "0",
    total: "33.00",
    payment_method: "efectivo",
    status: "completed",
    business_day_id: null,
    business_date: null,
    created_by_user_id: null,
    created_at: new Date().toISOString(),
    voided_at: null,
    void_reason: null,
  };
}
