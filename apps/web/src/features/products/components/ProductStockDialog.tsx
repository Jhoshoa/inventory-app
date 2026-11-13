"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, PackagePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { adjustStockAction } from "../actions";
import { BATCH_STATUS_LABEL, BATCH_STATUS_VARIANT } from "../batches";
import { shortDate } from "../form";
import { unitShort } from "../list";
import {
  DEFAULT_ALERT_DAYS,
  MAX_ALERT_DAYS,
  QUICK_DEDUCTION_REASONS,
  STOCK_ADJUSTMENT_MAX,
  STOCK_REASON_MAX,
  validateStockAdjustment,
} from "../schemas";
import type { ProductActionState, ProductBatch } from "../types";

type Mode = "add" | "remove";
type Errors = ProductActionState["fieldErrors"];

const initialProductActionState: ProductActionState = { ok: false, fieldErrors: {} };

/**
 * Ajustar stock (tablero P04): pestañas Agregar / Descontar, la cantidad siempre
 * positiva (la web pone el signo), "Stock después" en vivo, lote al agregar (vence el)
 * o de qué lote sale al descontar, razones rápidas. Hoja en el celular, ventana desde 640 px.
 */
export function ProductStockDialog({
  productId,
  productName,
  currentStock,
  unit = "unidad",
  trigger = "text",
  triggerLabel = "Ajustar stock",
  batches = [],
  preset,
  defaultAlertDays = DEFAULT_ALERT_DAYS,
  open: controlledOpen,
  onOpenChange,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  unit?: string;
  /** "compact": botón chico con borde (filas de la lista); "none": la abre otro control. */
  trigger?: "icon" | "text" | "compact" | "none";
  triggerLabel?: string;
  /** Lotes con unidades: para elegir de cuál sale al descontar. */
  batches?: ProductBatch[];
  /** "Retirar" un lote: abre Descontar con ese lote y su cantidad. */
  preset?: { quantity: number; batchId: string; reason?: string };
  /** Aviso de vencimiento de la tienda (si "Avisar días antes" queda vacío). */
  defaultAlertDays?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      {trigger === "none" ? null : trigger === "icon" ? (
        <Button variant="icon" onClick={() => setOpen(true)} aria-label={triggerLabel}>
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : trigger === "compact" ? (
        <Button variant="secondary" className="!h-[34px] rounded-[10px] !px-2.5 text-[13px]" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen} position="sheet" size="lg">
        {open ? (
          <StockAdjustForm
            productId={productId}
            productName={productName}
            currentStock={currentStock}
            unit={unit}
            batches={batches.filter((batch) => batch.quantity_remaining > 0)}
            preset={preset}
            defaultAlertDays={defaultAlertDays}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </Dialog>
    </>
  );
}

function StockAdjustForm({
  productId,
  productName,
  currentStock,
  unit,
  batches,
  preset,
  defaultAlertDays,
  onDone,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  unit: string;
  batches: ProductBatch[];
  preset?: { quantity: number; batchId: string; reason?: string };
  defaultAlertDays: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const id = (name: string) => `${name}-${fieldId}`;
  const [mode, setMode] = useState<Mode>(preset && preset.quantity < 0 ? "remove" : "add");
  const [amount, setAmount] = useState(preset ? String(Math.abs(preset.quantity)) : "");
  const [batchId, setBatchId] = useState(preset?.batchId ?? "");
  const [expiresOn, setExpiresOn] = useState("");
  const [alertDays, setAlertDays] = useState("");
  const [reason, setReason] = useState(preset?.reason ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const units = unitShort(unit);
  const parsed = /^\d+$/.test(amount) ? Number(amount) : null;
  const signed = parsed === null ? amount : String(mode === "remove" ? -parsed : parsed);
  const selectedBatch = mode === "remove" ? batches.find((batch) => batch.id === batchId) : undefined;
  const liveErrors = validateStockAdjustment(signed, reason, currentStock, {
    expiresOn: mode === "add" ? expiresOn : "",
    alertDays,
    batchId: mode === "remove" ? batchId : "",
    batchAvailable: selectedBatch?.quantity_remaining,
  });
  // Pasarse del stock o del lote se avisa al escribir; lo que falta, al intentar guardar.
  const shownErrors: Errors = {
    ...serverErrors,
    ...(submitted ? liveErrors : {}),
    ...(parsed !== null && liveErrors.quantity ? { quantity: liveErrors.quantity } : {}),
  };
  const blocking = parsed !== null && Boolean(liveErrors.quantity);
  const after = parsed === null ? null : mode === "add" ? currentStock + parsed : currentStock - parsed;

  useEffect(() => {
    if (!submitted) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitted, serverErrors]);

  function step(delta: number) {
    const next = Math.min(Math.max((parsed ?? 0) + delta, 1), STOCK_ADJUSTMENT_MAX);
    setAmount(String(next));
    setServerErrors({});
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(liveErrors).length > 0) return;

    setSaving(true);
    setServerErrors({});
    try {
      const formData = new FormData();
      formData.set("product_id", productId);
      formData.set("current_stock", String(currentStock));
      formData.set("quantity", signed);
      formData.set("reason", reason.trim());
      if (mode === "add" && expiresOn) {
        formData.set("expires_on", expiresOn);
        formData.set("alert_days", alertDays);
      }
      if (mode === "remove" && selectedBatch) {
        formData.set("batch_id", selectedBatch.id);
        formData.set("batch_available", String(selectedBatch.quantity_remaining));
      }
      const result = await adjustStockAction(initialProductActionState, formData);
      if (result.ok) {
        toast.success("Stock actualizado", { id: "stock-updated" });
        onDone();
        router.refresh();
      } else {
        setServerErrors(result.fieldErrors);
        if (result.message) toast.error(result.message);
      }
    } catch {
      toast.error("No se pudo ajustar el stock. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const actionLabel =
    parsed === null
      ? mode === "add"
        ? "Agregar"
        : "Descontar"
      : `${mode === "add" ? "Agregar" : "Descontar"} ${parsed} ${parsed === 1 ? "unidad" : "unidades"}`;

  return (
    <>
      <DialogTitle close={!saving}>Ajustar stock</DialogTitle>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="contents">
        <DialogBody className="space-y-4">
          <p className="text-sm text-text-muted">
            {productName} · hay {currentStock} {units}
          </p>

          <div role="radiogroup" aria-label="Tipo de ajuste" className="grid grid-cols-2 gap-1 rounded-control bg-app-surface-muted p-1">
            {(["add", "remove"] as Mode[]).map((option) => {
              const checked = mode === option;
              return (
                <label
                  key={option}
                  className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                    checked ? "bg-app-surface text-text-strong shadow-sm" : "text-text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="stock-mode"
                    value={option}
                    checked={checked}
                    onChange={() => {
                      setMode(option);
                      setServerErrors({});
                      setSubmitted(false);
                    }}
                    className="sr-only"
                  />
                  {option === "add" ? <Plus className="h-4 w-4" aria-hidden="true" /> : <Minus className="h-4 w-4" aria-hidden="true" />}
                  {option === "add" ? "Agregar" : "Descontar"}
                </label>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={id("quantity")}>{mode === "add" ? "Cantidad que entra" : "Cantidad que sale"}</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="icon" aria-label="Uno menos" onClick={() => step(-1)} disabled={(parsed ?? 0) <= 1}>
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Input
                id={id("quantity")}
                inputMode="numeric"
                autoComplete="off"
                data-autofocus
                className="max-w-[120px] text-center text-base font-bold"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d]/g, "").slice(0, 7));
                  setServerErrors({});
                }}
                error={Boolean(shownErrors.quantity)}
                aria-describedby={shownErrors.quantity ? id("quantity-error") : id("after")}
              />
              <Button type="button" variant="icon" aria-label="Uno más" onClick={() => step(1)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <FieldError id={id("quantity-error")} message={shownErrors.quantity} />
            <p id={id("after")} className="text-sm text-text-muted" aria-live="polite">
              Stock después:{" "}
              <strong className={after !== null && after < 0 ? "text-status-danger" : "text-text-strong"}>
                {currentStock} → {after ?? currentStock} {units}
              </strong>
            </p>
          </div>

          {mode === "add" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={id("expires")}>
                    Vence el <span className="font-normal text-text-muted">(opc.)</span>
                  </Label>
                  <Input
                    id={id("expires")}
                    type="date"
                    value={expiresOn}
                    onChange={(event) => setExpiresOn(event.target.value)}
                    error={Boolean(shownErrors.expires_on)}
                  />
                  <FieldError message={shownErrors.expires_on} />
                </div>
                {expiresOn ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={id("alert")}>Avisar días antes</Label>
                    <Input
                      id={id("alert")}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_ALERT_DAYS}
                      step={1}
                      placeholder={String(defaultAlertDays)}
                      value={alertDays}
                      onChange={(event) => setAlertDays(event.target.value)}
                      error={Boolean(shownErrors.alert_days)}
                    />
                    <FieldError message={shownErrors.alert_days} />
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-text-muted">
                {expiresOn
                  ? `Entra como un lote nuevo que vence el ${shortDate(expiresOn)}. Vacío el aviso: ${defaultAlertDays} días (aviso de la tienda).`
                  : "Con fecha entra como un lote nuevo. Sin fecha: stock sin lote."}
              </p>
            </div>
          ) : batches.length > 0 ? (
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium text-text-body">Sale de</legend>
              <BatchOption
                name={id("batch")}
                checked={batchId === ""}
                onSelect={() => setBatchId("")}
                label="Automático: primero el que vence antes"
              />
              {batches.map((batch) => (
                <BatchOption
                  key={batch.id}
                  name={id("batch")}
                  checked={batchId === batch.id}
                  onSelect={() => setBatchId(batch.id)}
                  label={`Lote ${shortDate(batch.expires_on)} · quedan ${batch.quantity_remaining}`}
                  badge={<Badge variant={BATCH_STATUS_VARIANT[batch.status]}>{BATCH_STATUS_LABEL[batch.status]}</Badge>}
                />
              ))}
            </fieldset>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={id("reason")}>
              Razón {mode === "add" ? <span className="font-normal text-text-muted">(opcional)</span> : null}
            </Label>
            {mode === "remove" ? (
              <div className="flex flex-wrap gap-1.5" aria-label="Razones rápidas">
                {QUICK_DEDUCTION_REASONS.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    aria-pressed={reason === quick}
                    onClick={() => setReason(quick)}
                    className={`h-8 rounded-full border px-3 text-[13px] font-semibold ${
                      reason === quick ? "border-text-strong bg-text-strong text-text-inverse" : "border-app-borderStrong text-text-body hover:bg-app-surface-muted"
                    }`}
                  >
                    {quick}
                  </button>
                ))}
              </div>
            ) : null}
            <Input
              id={id("reason")}
              maxLength={STOCK_REASON_MAX}
              autoComplete="off"
              placeholder={mode === "add" ? "Compra al proveedor, devolución…" : "¿Por qué sale?"}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              error={Boolean(shownErrors.reason)}
            />
            <FieldError message={shownErrors.reason} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onDone} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant={mode === "remove" ? "danger" : "primary"} disabled={saving || blocking}>
            {saving ? "Guardando…" : actionLabel}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function BatchOption({
  name,
  checked,
  onSelect,
  label,
  badge,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
        checked ? "border-brand-700 bg-brand-50" : "border-app-border hover:bg-app-surface-muted"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-4 w-4 accent-brand-700" />
      <span className="min-w-0 flex-1 font-semibold text-text-strong">{label}</span>
      {badge}
    </label>
  );
}
