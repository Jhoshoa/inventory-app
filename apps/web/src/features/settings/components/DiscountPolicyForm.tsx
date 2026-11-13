"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { updateDiscountPolicyAction } from "../actions";
import { validateDiscountPolicyForm } from "../schemas";
import type { DiscountPolicyFormValues, StoreResponse } from "../types";
import { SettingsCard } from "./SettingsField";

function initialValues(store: StoreResponse): DiscountPolicyFormValues {
  const amount = Number(store.max_manual_discount_amount);
  return {
    allowPercentageDiscount: store.allow_percentage_discount,
    maxPercentageDiscount: Number(store.max_percentage_discount) > 0 ? String(Number(store.max_percentage_discount)) : "",
    allowManualDiscount: store.allow_manual_discount,
    maxManualDiscountAmount: amount > 0 ? amount.toFixed(2).replace(".", ",") : "",
    allowCashierDiscountOverride: store.allow_cashier_discount_override,
  };
}

/**
 * Precios y descuentos (tablero P10): límites del descuento en porcentaje y de la rebaja
 * en bolivianos al cobrar, y si el cajero elige cuál aplicar.
 */
export function DiscountPolicyForm({ store }: { store: StoreResponse }) {
  const router = useRouter();
  const [values, setValues] = useState(() => initialValues(store));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof DiscountPolicyFormValues>(key: K, value: DiscountPolicyFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next.maxPercentageDiscount;
      delete next.maxManualDiscountAmount;
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validateDiscountPolicyForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(found.maxPercentageDiscount ? "max-percentage" : "max-amount")?.focus();
      return;
    }
    const data = new FormData();
    if (values.allowPercentageDiscount) data.set("allow_percentage_discount", "on");
    data.set("max_percentage_discount", values.maxPercentageDiscount);
    if (values.allowManualDiscount) data.set("allow_manual_discount", "on");
    data.set("max_manual_discount_amount", values.maxManualDiscountAmount);
    if (values.allowCashierDiscountOverride) data.set("allow_cashier_discount_override", "on");

    setSaving(true);
    try {
      const result = await updateDiscountPolicyAction({ ok: false, message: "", fieldErrors: {} }, data);
      if (result.ok) {
        toast.success("Guardado");
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

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <SettingsCard>
        <DiscountRow
          id="allow-percentage"
          title="Descuento en porcentaje"
          example="Ej. 10% de la venta"
          checked={values.allowPercentageDiscount}
          onToggle={(checked) => set("allowPercentageDiscount", checked)}
          inputId="max-percentage"
          inputLabel="Hasta (%)"
          error={errors.maxPercentageDiscount}
        >
          <Input
            id="max-percentage"
            inputMode="decimal"
            value={values.maxPercentageDiscount}
            onChange={(event) => set("maxPercentageDiscount", event.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="15"
            disabled={!values.allowPercentageDiscount}
            error={Boolean(errors.maxPercentageDiscount)}
            aria-describedby={errors.maxPercentageDiscount ? "max-percentage-error" : undefined}
            className="!w-24"
          />
        </DiscountRow>
        <div className="border-t border-app-border" />
        <DiscountRow
          id="allow-amount"
          title="Rebaja en bolivianos"
          example="Ej. Bs 5 menos"
          checked={values.allowManualDiscount}
          onToggle={(checked) => set("allowManualDiscount", checked)}
          inputId="max-amount"
          inputLabel="Hasta (Bs)"
          error={errors.maxManualDiscountAmount}
          hint={values.allowManualDiscount ? undefined : "Define un monto máximo mayor a 0 para habilitar esta opción."}
        >
          <MoneyInput
            id="max-amount"
            value={values.maxManualDiscountAmount}
            onChange={(event) => set("maxManualDiscountAmount", event.target.value)}
            placeholder="5,00"
            disabled={!values.allowManualDiscount}
            error={Boolean(errors.maxManualDiscountAmount)}
            aria-describedby={errors.maxManualDiscountAmount ? "max-amount-error" : undefined}
            className="!w-28"
          />
        </DiscountRow>
      </SettingsCard>

      <SettingsCard>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text-strong">El cajero elige qué descuento aplicar</span>
            <span className="block text-[13px] text-text-muted">Si no, se aplica el que más conviene al cliente.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={values.allowCashierDiscountOverride}
            onChange={(event) => set("allowCashierDiscountOverride", event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700"
          />
        </label>
      </SettingsCard>

      <Button type="submit" disabled={saving} className="self-start max-sm:w-full">
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

function DiscountRow({
  id,
  title,
  example,
  checked,
  onToggle,
  inputId,
  inputLabel,
  error,
  hint,
  children,
}: {
  id: string;
  title: string;
  example: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  inputId: string;
  inputLabel: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-text-strong">{title}</span>
          <span className="block text-[13px] text-text-muted">{example}</span>
        </span>
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(event) => onToggle(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700" />
      </label>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <label htmlFor={inputId} className={`text-sm ${checked ? "text-text-body" : "text-text-disabled"}`}>
            {inputLabel}
          </label>
          {children}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-status-danger">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-text-muted">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
