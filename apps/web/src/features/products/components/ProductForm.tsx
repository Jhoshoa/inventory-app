"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { ProductCategory } from "@/features/product-categories/types";
import { QrPreviewDialog } from "./QrPreviewDialog";
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
  const values = productToFormValues(product);
  const [categoryId, setCategoryId] = useState(values.category_id);
  const [sku, setSku] = useState(values.sku);
  const [scanCode, setScanCode] = useState(values.qr_code);
  const [isQrPreviewOpen, setIsQrPreviewOpen] = useState(false);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );
  const categoryName = selectedCategory?.name ?? values.category;
  const normalizedScanCode = scanCode.trim();

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      {product ? <input type="hidden" name="product_id" value={product.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="name" label="Nombre" error={state.fieldErrors.name}>
          <Input name="name" defaultValue={values.name} error={Boolean(state.fieldErrors.name)} />
        </Field>
        <Field name="category_id" label="Categoria" error={state.fieldErrors.category_id}>
          <Select
            name="category_id"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
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
            <p className="text-xs text-slate-500">Configura categorias en Ajustes para generar SKUs por prefijo.</p>
          ) : null}
        </Field>
        <Field name="sku" label="SKU" error={state.fieldErrors.sku}>
          <div className="flex gap-2">
            <Input
              name="sku"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              error={Boolean(state.fieldErrors.sku)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (selectedCategory) setSku(formatNextSku(selectedCategory));
              }}
              disabled={!selectedCategory}
            >
              Generar
            </Button>
          </div>
        </Field>
        <Field name="price" label="Precio venta" error={state.fieldErrors.price}>
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.price}
            error={Boolean(state.fieldErrors.price)}
          />
        </Field>
        <Field name="cost_price" label="Costo" error={state.fieldErrors.cost_price}>
          <Input
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.cost_price}
            error={Boolean(state.fieldErrors.cost_price)}
          />
        </Field>
        <Field name="stock" label="Stock" error={state.fieldErrors.stock}>
          <Input
            name="stock"
            type="number"
            min="0"
            defaultValue={values.stock}
            disabled={mode === "edit"}
            error={Boolean(state.fieldErrors.stock)}
          />
        </Field>
        <Field name="min_stock" label="Stock minimo" error={state.fieldErrors.min_stock}>
          <Input
            name="min_stock"
            type="number"
            min="0"
            defaultValue={values.min_stock}
            error={Boolean(state.fieldErrors.min_stock)}
          />
        </Field>
        <Field name="unit" label="Unidad" error={state.fieldErrors.unit}>
          <Input name="unit" defaultValue={values.unit} error={Boolean(state.fieldErrors.unit)} />
        </Field>
        <Field name="qr_code" label="Codigo escaneable" error={state.fieldErrors.qr_code}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="qr_code"
              value={scanCode}
              onChange={(event) => setScanCode(event.target.value)}
              error={Boolean(state.fieldErrors.qr_code)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setScanCode(generateScanCode())}>
                Generar
              </Button>
              <Button type="button" variant="secondary" onClick={() => setScanCode(sku)} disabled={!sku.trim()}>
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
        <Field name="photo_url" label="URL foto" error={state.fieldErrors.photo_url}>
          <Input
            name="photo_url"
            type="url"
            defaultValue={values.photo_url}
            error={Boolean(state.fieldErrors.photo_url)}
          />
        </Field>
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

function formatNextSku(category: ProductCategory) {
  return `${category.sku_prefix}${category.next_sku_number.toString().padStart(6, "0")}`;
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
