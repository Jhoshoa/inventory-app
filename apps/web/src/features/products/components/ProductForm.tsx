"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { ProductCategory } from "@/features/product-categories/types";
import { QrPreviewDialog } from "./QrPreviewDialog";
import { ImageUploader } from "./ImageUploader";
import {
  createProductAction,
  updateProductAction,
} from "../actions";
import { productToFormValues } from "../schemas";
import type { Product, ProductActionState } from "../types";

const initialProductActionState: ProductActionState = {
  ok: false,
  fieldErrors: {},
};

export function ProductForm({
  mode,
  product,
  categories = [],
}: {
  mode: "create" | "edit";
  product?: Product;
  categories?: ProductCategory[];
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialProductActionState,
  );
  const initialValues = productToFormValues(product);
  const values = state.values ?? initialValues;
  const [formValues, setFormValues] = useState(values);
  const [categoryId, setCategoryId] = useState(values.category_id);
  const [sku, setSku] = useState(values.sku);
  const [scanCode, setScanCode] = useState(values.qr_code);
  const [isQrPreviewOpen, setIsQrPreviewOpen] = useState(false);
  const photoRef = useRef<File | null>(null);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );
  const categoryName = selectedCategory?.name ?? formValues.category;
  const normalizedScanCode = scanCode.trim();
  const shouldUseAutomaticSku = mode === "create" && Boolean(selectedCategory);

  useEffect(() => {
    if (!state.values) return;
    setFormValues(state.values);
    setCategoryId(state.values.category_id);
    setSku(state.values.sku);
    setScanCode(state.values.qr_code);
  }, [state.values]);

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      {product ? <input type="hidden" name="product_id" value={product.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="name" label="Nombre" error={state.fieldErrors.name}>
          <Input
            id="name"
            name="name"
            value={formValues.name}
            onChange={(event) => updateField("name", event.target.value)}
            error={Boolean(state.fieldErrors.name)}
          />
        </Field>
        <Field name="category_id" label="Categoria" error={state.fieldErrors.category_id}>
          <Select
            id="category_id"
            name="category_id"
            value={categoryId}
            onChange={(event) => {
              const nextCategoryId = event.target.value;
              setCategoryId(nextCategoryId);
              updateField("category_id", nextCategoryId);
              if (mode === "create" && nextCategoryId) {
                setSku("");
                updateField("sku", "");
              }
            }}
            aria-label="Categoria"
          >
            <option value="">Sin categoria</option>
            {categories.filter((category) => category.is_active || category.id === categoryId).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <input type="hidden" name="category" value={categoryName} />
          {categories.length === 0 ? (
            <p className="text-xs text-text-muted">Configura categorias en Ajustes para generar SKUs por prefijo.</p>
          ) : null}
        </Field>
        {shouldUseAutomaticSku && selectedCategory ? (
          <div className="space-y-2">
            <Label>SKU</Label>
            <input type="hidden" name="sku" value="" />
            <div className="min-h-10 rounded-md border border-app-border bg-app-surface-muted px-3 py-2 text-sm">
              <p className="font-medium text-text-strong">Automatico al guardar</p>
              <p className="text-xs text-text-muted">
                Se generara en el servidor con prefijo {selectedCategory.sku_prefix}.
              </p>
            </div>
            <FieldError message={state.fieldErrors.sku} />
          </div>
        ) : (
          <Field name="sku" label="SKU" error={state.fieldErrors.sku}>
            <Input
              id="sku"
              name="sku"
              value={sku}
              onChange={(event) => {
                setSku(event.target.value);
                updateField("sku", event.target.value);
              }}
              error={Boolean(state.fieldErrors.sku)}
            />
          </Field>
        )}
        <Field name="price" label="Precio venta" error={state.fieldErrors.price}>
          <Input
            name="price"
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formValues.price}
            onChange={(event) => updateField("price", event.target.value)}
            error={Boolean(state.fieldErrors.price)}
          />
        </Field>
        <Field name="cost_price" label="Costo" error={state.fieldErrors.cost_price}>
          <Input
            name="cost_price"
            id="cost_price"
            type="number"
            step="0.01"
            min="0"
            value={formValues.cost_price}
            onChange={(event) => updateField("cost_price", event.target.value)}
            error={Boolean(state.fieldErrors.cost_price)}
          />
        </Field>
        <Field name="stock" label="Stock" error={state.fieldErrors.stock}>
          <Input
            name="stock"
            id="stock"
            type="number"
            min="0"
            value={formValues.stock}
            onChange={(event) => updateField("stock", event.target.value)}
            disabled={mode === "edit"}
            error={Boolean(state.fieldErrors.stock)}
          />
        </Field>
        <Field name="min_stock" label="Stock minimo" error={state.fieldErrors.min_stock}>
          <Input
            name="min_stock"
            id="min_stock"
            type="number"
            min="0"
            value={formValues.min_stock}
            onChange={(event) => updateField("min_stock", event.target.value)}
            error={Boolean(state.fieldErrors.min_stock)}
          />
        </Field>
        <Field name="unit" label="Unidad" error={state.fieldErrors.unit}>
          <Input
            id="unit"
            name="unit"
            value={formValues.unit}
            onChange={(event) => updateField("unit", event.target.value)}
            error={Boolean(state.fieldErrors.unit)}
          />
        </Field>
        <Field name="qr_code" label="Codigo escaneable" error={state.fieldErrors.qr_code}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="qr_code"
              id="qr_code"
              value={scanCode}
              onChange={(event) => {
                setScanCode(event.target.value);
                updateField("qr_code", event.target.value);
              }}
              error={Boolean(state.fieldErrors.qr_code)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const nextCode = generateScanCode();
                  setScanCode(nextCode);
                  updateField("qr_code", nextCode);
                }}
              >
                Generar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setScanCode(sku);
                  updateField("qr_code", sku);
                }}
                disabled={!sku.trim()}
              >
                Usar SKU
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsQrPreviewOpen(true)}
                disabled={!normalizedScanCode}
              >
                Ver QR
              </Button>
            </div>
          </div>
        </Field>
      </div>

      <div className="col-span-full max-w-64">
        {mode === "edit" && product ? (
          <ImageUploader
            currentUrl={product.photo_url}
            productId={product.id}
            productVersion={product.version}
            onPhotoChange={(photoUrl) => {
              updateField("photo_url", photoUrl ?? "");
            }}
          />
        ) : (
          <ImageUploader
            onPhotoChange={() => {}}
            photoRef={photoRef}
          />
        )}
      </div>

      {mode === "edit" ? (
        <Alert>
          Para mantener auditoria, el stock se cambia desde Ajustar stock en el detalle o tabla.
        </Alert>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </Button>
      </div>

      <QrPreviewDialog
        open={isQrPreviewOpen}
        code={normalizedScanCode}
        productName={product?.name}
        onClose={() => setIsQrPreviewOpen(false)}
      />
    </form>
  );
}

function generateScanCode() {
  return `P-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

function Field({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
