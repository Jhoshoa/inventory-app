"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select } from "@/components/ui/Select";
import { useUnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { PosCameraScanner } from "@/features/pos/components/PosCameraScanner";
import { CategoryDialog } from "@/features/product-categories/components/CategoryDialog";
import { nextSku } from "@/features/product-categories/schemas";
import type { ProductCategory } from "@/features/product-categories/types";
import { LocationList } from "@/features/store-locations/components/LocationList";
import { LocationPicker, type PickedLocation } from "@/features/store-locations/components/LocationPicker";
import { ProductLocationsDialog } from "@/features/store-locations/components/ProductLocationsDialog";
import type { StoreLocation } from "@/features/store-locations/types";
import { formatCurrency } from "@/lib/format/currency";
import { createProductAction, updateProductAction } from "../actions";
import { automaticCodeHint, discountedPrice, margin, shortDate, UNIT_SUGGESTIONS } from "../form";
import { productInitials, thumbColor, unitShort } from "../list";
import {
  DEFAULT_ALERT_DAYS,
  MAX_ALERT_DAYS,
  moneyNumber,
  PRODUCT_LIMITS,
  productToFormValues,
  validateProductForm,
  type DiscountPolicy,
} from "../schemas";
import type { Product, ProductActionState, ProductBatchListResponse, ProductFormValues } from "../types";
import { ImageUploader } from "./ImageUploader";
import { QrPreviewDialog } from "./QrPreviewDialog";

const initialState: ProductActionState = { ok: false, fieldErrors: {} };
const FORM_ID = "product-form";

type Errors = ProductActionState["fieldErrors"];

/**
 * Nuevo / Editar producto (tablero P02). Celular: una columna con barra fija abajo
 * (Cancelar · Crear producto). Escritorio: datos a la izquierda; foto y "Así se ve al
 * vender" a la derecha; botones arriba. Los errores de la API (409) van en su campo.
 */
export function ProductForm({
  mode,
  product,
  categories: initialCategories = [],
  storeLocations: initialLocations = [],
  policy = null,
  defaultAlertDays = DEFAULT_ALERT_DAYS,
  batches = null,
  duplicateOf = null,
}: {
  /** "Duplicar" (tablero P03): nuevo producto con los datos de otro, sin SKU, código ni stock. */
  duplicateOf?: Product | null;
  mode: "create" | "edit";
  product?: Product;
  categories?: ProductCategory[];
  storeLocations?: StoreLocation[];
  /** Límites de descuento de la tienda; null si no se pudieron leer (solo valida la API). */
  policy?: DiscountPolicy | null;
  /** Aviso de vencimiento de la tienda: se usa si "Avisar días antes" queda vacío. */
  defaultAlertDays?: number;
  batches?: ProductBatchListResponse | null;
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const initialValues = useMemo(() => {
    if (!duplicateOf) return productToFormValues(product);
    const copied = productToFormValues(duplicateOf);
    return { ...copied, name: `${duplicateOf.name} (copia)`.slice(0, PRODUCT_LIMITS.name), sku: "", qr_code: "", stock: "0" };
  }, [product, duplicateOf]);
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<Errors | null>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [storeLocations, setStoreLocations] = useState(initialLocations);
  const [picked, setPicked] = useState<PickedLocation[]>(
    () => duplicateOf?.locations?.map((location) => ({ location_id: location.id, kind: location.kind })) ?? [],
  );
  const [manualSku, setManualSku] = useState(mode === "edit");
  const [photoChosen, setPhotoChosen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showingQr, setShowingQr] = useState(false);
  const photoRef = useRef<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  // Lo que volvió del servidor (error) se muestra tal cual se escribió.
  useEffect(() => {
    if (state.values) setValues(state.values);
    setClientErrors(null);
    submittedRef.current = false;
  }, [state]);

  const errors: Errors = clientErrors ?? state.fieldErrors;
  const errorCount = Object.values(errors).filter(Boolean).length;
  const dirty =
    !submittedRef.current &&
    (JSON.stringify(values) !== JSON.stringify(initialValues) || picked.length > (duplicateOf?.locations?.length ?? 0) || photoChosen);
  const guard = useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (errorCount === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors, errorCount]);

  const selectedCategory = categories.find((category) => category.id === values.category_id);
  const automaticSku = mode === "create" && selectedCategory && !manualSku ? nextSku(selectedCategory) : null;
  const skuForCode = automaticSku ?? (values.sku.trim() || null);
  const profit = margin(values.price, values.cost_price);
  const finalPrice = discountedPrice(values.price, values.discount_type, values.discount_value);
  const cancelHref = product ? `/dashboard/products/${product.id}` : "/dashboard/products";

  function set<K extends keyof ProductFormValues>(name: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [name]: value }));
    if (clientErrors?.[name]) setClientErrors((current) => (current ? { ...current, [name]: undefined } : current));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    const found = validateProductForm(values, mode, policy);
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setClientErrors(found);
      return;
    }
    submittedRef.current = true;
  }

  const fieldProps = (name: keyof ProductFormValues, hint?: boolean) => ({
    id: name,
    name,
    error: Boolean(errors[name]),
    "aria-describedby": [hint ? `${name}-hint` : null, errors[name] ? `${name}-error` : null].filter(Boolean).join(" ") || undefined,
  });

  const submitLabel = isPending ? "Guardando…" : mode === "create" ? "Crear producto" : "Guardar cambios";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="Ruta" className="mb-1 flex min-w-0 items-center gap-1 text-[13px] font-semibold text-text-muted">
            <Link href="/dashboard/products" className="hover:text-text-strong">
              Productos
            </Link>
            {product ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={`/dashboard/products/${product.id}`} className="truncate hover:text-text-strong">
                  {product.name}
                </Link>
                <span aria-hidden="true">/ Editar</span>
              </>
            ) : null}
          </nav>
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </h1>
        </div>
        <div className="flex gap-2 max-sm:hidden">
          <Button variant="secondary" onClick={() => guard.leave(cancelHref)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </header>

      {duplicateOf && mode === "create" ? (
        <p className="rounded-control border border-status-infoBorder bg-status-infoBg px-3 py-2.5 text-sm text-text-body">
          Copiado de <strong>{duplicateOf.name}</strong>. Cambia el nombre; el SKU, el código y el stock empiezan vacíos.
        </p>
      ) : null}

      {errorCount > 0 ? (
        <p role="alert" className="rounded-control border border-status-dangerBorder bg-status-dangerBg px-3 py-2.5 text-sm font-semibold text-status-danger">
          {errorCount === 1 ? "Revisa 1 campo antes de guardar." : `Revisa ${errorCount} campos antes de guardar.`}
        </p>
      ) : state.message && !state.ok ? (
        <p role="alert" className="rounded-control border border-status-dangerBorder bg-status-dangerBg px-3 py-2.5 text-sm text-status-danger">
          {state.message}
        </p>
      ) : null}

      <form
        id={FORM_ID}
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        className="grid gap-4 pb-24 sm:pb-0 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr] lg:items-start"
      >
        {product ? <input type="hidden" name="product_id" value={product.id} /> : null}
        <input type="hidden" name="category" value={selectedCategory?.name ?? values.category} />
        <input type="hidden" name="locations" value={JSON.stringify(picked)} />

        {/* Una sola foto: arriba en el celular, a la derecha desde 1024 px. */}
        {/* El título "Foto" lo pone ImageUploader. Hasta 1024 px los cuadros de la foto
            son bajos (2:1) para que no ocupen toda la primera pantalla del celular. */}
        <Section title={null} className="max-lg:[&_.aspect-square]:aspect-[2/1] lg:col-start-2 lg:row-start-1">
          <PhotoField mode={mode} product={product} photoRef={photoRef} onChosen={setPhotoChosen} />
        </Section>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Section title="Datos">
            <FormField id="name" label="Nombre" error={errors.name}>
              <Input
                {...fieldProps("name")}
                maxLength={PRODUCT_LIMITS.name}
                autoComplete="off"
                placeholder="Leche Pil 1l"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <FormField
                id="category_id"
                label="Categoría"
                error={errors.category_id}
                action={
                  <button type="button" className="text-sm font-bold text-brand-700 hover:underline" onClick={() => setCreatingCategory(true)}>
                    + Nueva
                  </button>
                }
              >
                <Select {...fieldProps("category_id")} value={values.category_id} onChange={(event) => set("category_id", event.target.value)}>
                  <option value="">Sin categoría</option>
                  {categories
                    .filter((category) => category.is_active || category.id === values.category_id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {category.is_active ? "" : " (desactivada)"}
                      </option>
                    ))}
                </Select>
              </FormField>
              <FormField id="unit" label="Unidad" error={errors.unit}>
                <Input
                  {...fieldProps("unit")}
                  maxLength={PRODUCT_LIMITS.unit}
                  list="unit-suggestions"
                  autoComplete="off"
                  value={values.unit}
                  onChange={(event) => set("unit", event.target.value)}
                />
                <datalist id="unit-suggestions">
                  {UNIT_SUGGESTIONS.map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
              </FormField>
            </div>

            {automaticSku ? (
              <div className="rounded-control border border-status-infoBorder bg-status-infoBg px-3 py-2.5 text-sm text-text-body">
                <input type="hidden" name="sku" value="" />
                SKU automático: se generará <strong className="font-mono text-text-strong">{automaticSku}</strong> al guardar.{" "}
                <button type="button" className="font-bold text-brand-700 hover:underline" onClick={() => setManualSku(true)}>
                  Escribir otro
                </button>
                {errors.sku ? (
                  <p id="sku-error" className="mt-1 text-status-danger">
                    {errors.sku}
                  </p>
                ) : null}
              </div>
            ) : (
              <FormField id="sku" label="SKU" optional error={errors.sku}>
                <Input
                  {...fieldProps("sku")}
                  maxLength={PRODUCT_LIMITS.sku}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  value={values.sku}
                  onChange={(event) => set("sku", event.target.value.toUpperCase())}
                />
              </FormField>
            )}

            <FormField
              id="qr_code"
              label="Código para escanear"
              optional
              error={errors.qr_code}
              hint={values.qr_code.trim() ? undefined : automaticCodeHint(skuForCode)}
            >
              <div className="flex gap-2">
                <Input
                  {...fieldProps("qr_code", !values.qr_code.trim())}
                  maxLength={PRODUCT_LIMITS.qr_code}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  className="font-mono"
                  placeholder="7751234000123"
                  value={values.qr_code}
                  onChange={(event) => set("qr_code", event.target.value.toUpperCase())}
                />
                <Button type="button" variant="secondary" className="shrink-0 sm:hidden" onClick={() => setScanning(true)}>
                  <ScanLine className="h-4 w-4" aria-hidden="true" />
                  Escanear
                </Button>
                {values.qr_code.trim() ? (
                  <Button type="button" variant="secondary" className="shrink-0 max-sm:hidden" onClick={() => setShowingQr(true)}>
                    Ver QR
                  </Button>
                ) : null}
              </div>
            </FormField>
          </Section>

          <Section title="Precio">
            <div className="grid grid-cols-2 gap-3">
              <FormField id="price" label="Precio de venta" error={errors.price}>
                <MoneyInput {...fieldProps("price")} placeholder="0,00" value={values.price} onChange={(event) => set("price", event.target.value)} />
              </FormField>
              <FormField id="cost_price" label="Costo" optional error={errors.cost_price}>
                <MoneyInput
                  {...fieldProps("cost_price")}
                  placeholder="0,00"
                  value={values.cost_price}
                  onChange={(event) => set("cost_price", event.target.value)}
                />
              </FormField>
            </div>
            {profit ? (
              <p className={`text-sm ${profit.amount < 0 ? "font-semibold text-status-danger" : "text-text-muted"}`} aria-live="polite">
                {profit.amount < 0
                  ? `Pierdes ${formatCurrency(-profit.amount)} por unidad: el costo es mayor al precio.`
                  : `Ganas ${formatCurrency(profit.amount)} por unidad (${profit.percent}%).`}
              </p>
            ) : null}

            <DiscountFields values={values} errors={errors} policy={policy} finalPrice={finalPrice} onChange={set} />
          </Section>

          <Section title="Stock">
            {mode === "create" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField id="stock" label="Stock inicial" error={errors.stock}>
                    <Input
                      {...fieldProps("stock")}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={values.stock}
                      onChange={(event) => set("stock", event.target.value)}
                    />
                  </FormField>
                  <FormField id="min_stock" label="Avisar si baja de" error={errors.min_stock}>
                    <Input
                      {...fieldProps("min_stock")}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="1"
                      value={values.min_stock}
                      onChange={(event) => set("min_stock", event.target.value)}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField id="expires_on" label="Vence el" optional error={errors.expires_on}>
                    <Input {...fieldProps("expires_on")} type="date" value={values.expires_on} onChange={(event) => set("expires_on", event.target.value)} />
                  </FormField>
                  {values.expires_on ? (
                    <FormField
                      id="alert_days"
                      label="Avisar días antes"
                      error={errors.alert_days}
                      hint={`Vacío: ${defaultAlertDays === 1 ? "1 día" : `${defaultAlertDays} días`} (aviso de la tienda).`}
                    >
                      <Input
                        {...fieldProps("alert_days", true)}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={MAX_ALERT_DAYS}
                        step={1}
                        placeholder={String(defaultAlertDays)}
                        value={values.alert_days}
                        onChange={(event) => set("alert_days", event.target.value)}
                      />
                    </FormField>
                  ) : null}
                </div>
                {values.expires_on && Number(values.stock) > 0 && !errors.expires_on ? (
                  <p className="text-sm text-text-muted">
                    {Number(values.stock) === 1 ? "La unidad entra" : `Las ${values.stock} unidades entran`} como un lote que vence el{" "}
                    {shortDate(values.expires_on)}.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <input type="hidden" name="stock" value={values.stock} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="block text-sm font-medium text-text-body">Stock actual</span>
                    <p className="flex h-control items-center rounded-control border border-app-border bg-app-surface-muted px-3 text-sm font-semibold text-text-strong">
                      {values.stock} {unitShort(values.unit)}
                    </p>
                  </div>
                  <FormField id="min_stock" label="Avisar si baja de" error={errors.min_stock}>
                    <Input
                      {...fieldProps("min_stock")}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="1"
                      value={values.min_stock}
                      onChange={(event) => set("min_stock", event.target.value)}
                    />
                  </FormField>
                </div>
                <p className="text-xs text-text-muted">El stock se cambia con &quot;Ajustar stock&quot; en el detalle, para que quede en el historial.</p>
              </>
            )}
          </Section>

          <Section title={mode === "create" ? null : "Dónde está"}>
            {mode === "create" ? (
              <LocationPicker
                locations={storeLocations}
                value={picked}
                onChange={setPicked}
                onLocationCreated={(location) => setStoreLocations((current) => [...current, location])}
              />
            ) : product ? (
              <div className="flex flex-wrap items-start justify-between gap-2">
                {product.locations && product.locations.length > 0 ? (
                  <LocationList locations={product.locations} />
                ) : (
                  <p className="text-sm text-text-muted">Sin lugar asignado.</p>
                )}
                <ProductLocationsDialog productId={product.id} current={product.locations ?? []} storeLocations={storeLocations} />
              </div>
            ) : null}
          </Section>

          {mode === "edit" && product && batches && batches.items.length > 0 ? (
            <Section title="Lotes">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-text-body">{batchSummary(batches)}</span>
                <Link href={`/dashboard/products/${product.id}`} className="font-bold text-brand-700 hover:underline">
                  Ver en el detalle
                </Link>
              </div>
            </Section>
          ) : null}
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <SalePreview values={values} finalPrice={finalPrice} product={product} picked={picked} storeLocations={storeLocations} />
        </div>
      </form>

      {/* Celular: barra fija abajo en lugar de la barra de pestañas (tablero P00). */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-app-border bg-app-surface px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:hidden">
        <Button variant="secondary" className="flex-1" onClick={() => guard.leave(cancelHref)} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} className="flex-[1.6]" disabled={isPending}>
          {submitLabel}
        </Button>
      </div>

      <CategoryDialog
        open={creatingCategory}
        category={null}
        submitLabel="Crear y usar"
        note="Lo que escribiste en el producto no se pierde."
        onOpenChange={setCreatingCategory}
        onSaved={(category) => {
          setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name, "es")));
          set("category_id", category.id);
          setManualSku(mode === "edit");
          setCreatingCategory(false);
        }}
      />
      <PosCameraScanner
        open={scanning}
        onOpenChange={setScanning}
        onDetected={(code) => {
          set("qr_code", code.toUpperCase());
          setScanning(false);
        }}
        onTypeCode={() => window.setTimeout(() => document.getElementById("qr_code")?.focus(), 0)}
      />
      <QrPreviewDialog open={showingQr} code={values.qr_code} productName={values.name} onClose={() => setShowingQr(false)} />
      {guard.dialog}
    </div>
  );
}

function DiscountFields({
  values,
  errors,
  policy,
  finalPrice,
  onChange,
}: {
  values: ProductFormValues;
  errors: Errors;
  policy: DiscountPolicy | null;
  finalPrice: number | null;
  onChange: <K extends keyof ProductFormValues>(name: K, value: ProductFormValues[K]) => void;
}) {
  const options: { value: ProductFormValues["discount_type"]; label: string; disabled: boolean }[] = [
    { value: "", label: "Sin descuento", disabled: false },
    {
      value: "percentage",
      label: "%",
      disabled: policy !== null && !policy.percentage.allowed && values.discount_type !== "percentage",
    },
    { value: "fixed", label: "Bs", disabled: policy !== null && !policy.fixed.allowed && values.discount_type !== "fixed" },
  ];
  const rule = values.discount_type && policy ? policy[values.discount_type] : null;

  return (
    <fieldset className="space-y-3 border-t border-app-border pt-3">
      <legend className="float-left mb-2 text-sm font-medium text-text-body">
        Descuento <span className="font-normal text-text-muted">(opcional)</span>
      </legend>
      <div className="clear-left flex gap-1 rounded-control bg-app-surface-muted p-1" role="radiogroup" aria-label="Tipo de descuento">
        {options.map((option) => {
          const checked = values.discount_type === option.value;
          return (
            <label
              key={option.value || "none"}
              className={`flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-[8px] px-2 text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                option.value ? "flex-1" : "flex-[2]"
              } ${
                checked ? "bg-app-surface text-text-strong shadow-sm" : "text-text-muted"
              } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="discount_type"
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={() => {
                  onChange("discount_type", option.value);
                  if (!option.value) {
                    onChange("discount_value", "");
                    onChange("discount_ends_at", "");
                  }
                }}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {policy && (!policy.percentage.allowed || !policy.fixed.allowed) ? (
        <p className="text-xs text-text-muted">
          {!policy.percentage.allowed && !policy.fixed.allowed
            ? "La tienda no permite descuentos en productos."
            : !policy.percentage.allowed
              ? "La tienda no permite descuentos por porcentaje."
              : "La tienda no permite rebajas en Bs."}{" "}
          Se cambia en Configuración › Precios y descuentos.
        </p>
      ) : null}

      {values.discount_type ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="discount_value" label={values.discount_type === "percentage" ? "Porcentaje" : "Rebaja en Bs"} error={errors.discount_value}>
              <MoneyInput
                id="discount_value"
                name="discount_value"
                placeholder={values.discount_type === "percentage" ? "10" : "0,00"}
                value={values.discount_value}
                onChange={(event) => onChange("discount_value", event.target.value)}
                error={Boolean(errors.discount_value)}
                aria-describedby={errors.discount_value ? "discount_value-error" : undefined}
              />
            </FormField>
            <FormField id="discount_ends_at" label="Hasta" optional error={errors.discount_ends_at}>
              <Input
                id="discount_ends_at"
                name="discount_ends_at"
                type="date"
                value={values.discount_ends_at}
                onChange={(event) => onChange("discount_ends_at", event.target.value)}
                error={Boolean(errors.discount_ends_at)}
                aria-describedby={errors.discount_ends_at ? "discount_ends_at-error" : undefined}
              />
            </FormField>
          </div>
          <p className="text-sm text-text-muted" aria-live="polite">
            {finalPrice !== null ? (
              <>
                Precio con descuento: <strong className="text-text-strong">{formatCurrency(finalPrice)}</strong>
              </>
            ) : (
              "Escribe el precio y el descuento para ver el precio final."
            )}
            {rule ? ` · límite de la tienda: ${values.discount_type === "percentage" ? `${rule.max}%` : formatCurrency(rule.max)}` : ""}
            {values.discount_ends_at ? "" : ". Sin fecha, sigue hasta que lo quites."}
          </p>
        </>
      ) : (
        <input type="hidden" name="discount_value" value="" />
      )}
    </fieldset>
  );
}

function PhotoField({
  mode,
  product,
  photoRef,
  onChosen,
}: {
  mode: "create" | "edit";
  product?: Product;
  photoRef: React.MutableRefObject<File | null>;
  onChosen: (chosen: boolean) => void;
}) {
  if (mode === "edit" && product) {
    // Al editar la foto se guarda sola (no espera "Guardar cambios").
    return <ImageUploader currentUrl={product.photo_url} productId={product.id} productVersion={product.version} onPhotoChange={() => {}} />;
  }
  return (
    <>
      <ImageUploader photoRef={photoRef} onPhotoChange={() => onChosen(photoRef.current !== null)} />
      <p className="mt-2 text-xs text-text-muted">Opcional. Si la foto falla, el producto se guarda igual.</p>
    </>
  );
}

/** "Así se ve al vender" (tablero P02): nombre, dónde está, stock y precio con descuento. */
function SalePreview({
  values,
  finalPrice,
  product,
  picked,
  storeLocations,
}: {
  values: ProductFormValues;
  finalPrice: number | null;
  product?: Product;
  picked: PickedLocation[];
  storeLocations: StoreLocation[];
}) {
  const name = values.name.trim() || "Nombre del producto";
  const place = product
    ? product.locations?.[0]?.label
    : storeLocations.find((location) => location.id === picked[0]?.location_id)?.label;
  const listPrice = moneyNumber(values.price);
  const price = finalPrice ?? listPrice;
  const color = thumbColor(name);
  const detail = [place, `${values.stock || 0} ${unitShort(values.unit)}`].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="sale-preview-title" className="rounded-card border border-app-border bg-app-surface p-4">
      <h2 id="sale-preview-title" className="mb-3 text-sm font-bold text-text-strong">
        Así se ve al vender
      </h2>
      <div className="flex items-center gap-3 rounded-[14px] border border-app-border p-2.5">
        {product?.photo_url ? (
          <img src={product.photo_url} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
        ) : (
          <span
            aria-hidden="true"
            style={{ background: color.bg, color: color.fg }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold"
          >
            {productInitials(name)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <strong className={`block truncate text-sm ${values.name.trim() ? "text-text-strong" : "text-text-muted"}`}>{name}</strong>
          <span className="block truncate text-xs text-text-muted">{detail}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold text-text-strong">{price !== null ? formatCurrency(price) : "Bs —"}</span>
          {finalPrice !== null && listPrice !== null ? (
            <span className="block text-xs text-text-muted line-through">
              <span className="sr-only">Antes </span>
              {formatCurrency(listPrice)}
            </span>
          ) : null}
        </span>
      </div>
    </section>
  );
}

function Section({
  title,
  optional = false,
  className = "",
  children,
}: {
  title: string | null;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-3 rounded-card border border-app-border bg-app-surface p-4 ${className}`}>
      {title ? (
        <h2 className="text-[15px] font-bold text-text-strong">
          {title} {optional ? <span className="font-normal text-text-muted">(opcional)</span> : null}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function FormField({
  id,
  label,
  optional = false,
  hint,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-text-body">
          {label} {optional ? <span className="font-normal text-text-muted">(opc.)</span> : null}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-status-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function batchSummary(batches: ProductBatchListResponse) {
  const active = batches.items.filter((batch) => batch.quantity_remaining > 0);
  if (active.length === 0) return "Sin lotes con unidades";
  const next = [...active].sort((a, b) => a.expires_on.localeCompare(b.expires_on))[0];
  return `${active.length === 1 ? "1 lote" : `${active.length} lotes`} · próximo vence ${shortDate(next.expires_on)}`;
}
