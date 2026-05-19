"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
}: {
  mode: "create" | "edit";
  product?: Product;
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialProductActionState,
  );
  const values = productToFormValues(product);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      {product ? <input type="hidden" name="product_id" value={product.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="name" label="Nombre" error={state.fieldErrors.name}>
          <Input name="name" defaultValue={values.name} error={Boolean(state.fieldErrors.name)} />
        </Field>
        <Field name="sku" label="SKU / Codigo" error={state.fieldErrors.sku}>
          <Input name="sku" defaultValue={values.sku} error={Boolean(state.fieldErrors.sku)} />
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
        <Field name="category" label="Categoria" error={state.fieldErrors.category}>
          <Input
            name="category"
            defaultValue={values.category}
            error={Boolean(state.fieldErrors.category)}
          />
        </Field>
        <Field name="qr_code" label="QR / Codigo unico" error={state.fieldErrors.qr_code}>
          <Input
            name="qr_code"
            defaultValue={values.qr_code}
            error={Boolean(state.fieldErrors.qr_code)}
          />
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
    </form>
  );
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
