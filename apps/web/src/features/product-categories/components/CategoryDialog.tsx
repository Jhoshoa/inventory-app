"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { saveProductCategoryAction } from "../actions";
import { CATEGORY_LIMITS, suggestSkuPrefix, validateProductCategoryForm } from "../schemas";
import type { ProductCategory, ProductCategoryActionState } from "../types";

const initialState: ProductCategoryActionState = { ok: false, fieldErrors: {} };

/**
 * Nueva / Editar categoría (tablero P01B): hoja desde abajo en el celular, ventana
 * desde 640 px. Los errores (también el 409 de nombre o prefijo repetido) van en su campo.
 */
export function CategoryDialog({
  open,
  category,
  onOpenChange,
  onSaved,
  onDeactivate,
  submitLabel,
  note,
}: {
  open: boolean;
  /** null: nueva categoría. */
  category: ProductCategory | null;
  /** P. ej. "Crear y usar" desde el formulario de producto. */
  submitLabel?: string;
  /** Texto bajo el título, p. ej. "Lo que escribiste en el producto no se pierde." */
  note?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: ProductCategory) => void;
  /** "Desactivar…" dentro de Editar (solo si está activa). */
  onDeactivate?: (category: ProductCategory) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} position="sheet" size="md">
      {/* key: cada vez que se abre arranca con los datos de esa categoría. */}
      {open ? (
        <CategoryForm
          key={category?.id ?? "new"}
          category={category}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
          onDeactivate={onDeactivate}
          submitLabel={submitLabel}
          note={note}
        />
      ) : null}
    </Dialog>
  );
}

function CategoryForm({
  category,
  onCancel,
  onSaved,
  onDeactivate,
  submitLabel,
  note,
}: {
  category: ProductCategory | null;
  submitLabel?: string;
  note?: string;
  onCancel: () => void;
  onSaved: (category: ProductCategory) => void;
  onDeactivate?: (category: ProductCategory) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [prefix, setPrefix] = useState(category?.sku_prefix ?? "");
  // Al crear, el prefijo se sugiere del nombre hasta que la persona lo cambie.
  const [prefixTouched, setPrefixTouched] = useState(category !== null);
  const [state, setState] = useState<ProductCategoryActionState>(initialState);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Con un error, el foco va al primer campo que lo tiene (teclado y lector de pantalla).
  useEffect(() => {
    if (Object.keys(state.fieldErrors).length === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state.fieldErrors]);
  const editing = category !== null;
  const prefixOk = /^[A-Z0-9]{1,8}$/.test(prefix);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Puede estar dentro del formulario de producto (React pasa el submit a través del portal).
    event.stopPropagation();
    if (saving) return;
    const fieldErrors = validateProductCategoryForm({ name, sku_prefix: prefix });
    if (Object.keys(fieldErrors).length > 0) {
      setState({ ok: false, fieldErrors });
      return;
    }
    setSaving(true);
    try {
      const next = await saveProductCategoryAction(initialState, new FormData(event.currentTarget));
      setState(next);
      if (next.ok && next.category) {
        toast.success(next.message ?? "Categoría guardada");
        onSaved(next.category);
      } else if (next.message) {
        toast.error(next.message);
      }
    } catch {
      const message = "No se pudo guardar la categoría. Revisa tu conexión e intenta de nuevo.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogTitle close={!saving}>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="contents">
        <DialogBody className="space-y-4">
          {note ? <p className="text-sm text-text-muted">{note}</p> : null}
          {editing ? <input type="hidden" name="category_id" value={category.id} /> : null}
          {state.message ? (
            <p role="alert" className="rounded-control border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
              {state.message}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Nombre</Label>
            <Input
              id="category-name"
              name="name"
              data-autofocus
              autoComplete="off"
              maxLength={CATEGORY_LIMITS.name}
              placeholder="Lácteos, Bebidas, Limpieza…"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!prefixTouched) setPrefix(suggestSkuPrefix(event.target.value));
              }}
              error={Boolean(state.fieldErrors.name)}
              aria-describedby={state.fieldErrors.name ? "category-name-error" : undefined}
            />
            <FieldError id="category-name-error" message={state.fieldErrors.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-prefix">Prefijo del SKU</Label>
            <Input
              id="category-prefix"
              name="sku_prefix"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={CATEGORY_LIMITS.sku_prefix}
              placeholder="LAC"
              className="font-mono uppercase"
              value={prefix}
              onChange={(event) => {
                setPrefixTouched(true);
                setPrefix(event.target.value.toUpperCase().replace(/\s+/g, ""));
              }}
              error={Boolean(state.fieldErrors.sku_prefix)}
              aria-describedby={`category-prefix-hint${state.fieldErrors.sku_prefix ? " category-prefix-error" : ""}`}
            />
            <FieldError id="category-prefix-error" message={state.fieldErrors.sku_prefix} />
            <p id="category-prefix-hint" className="text-xs text-text-muted">
              {editing
                ? "Los SKU que ya existen no cambian; solo los productos nuevos usan el prefijo nuevo."
                : `Letras y números, hasta ${CATEGORY_LIMITS.sku_prefix}${prefixTouched ? "" : ", se sugiere del nombre"}. Los productos quedan como ${
                    prefixOk ? `${prefix}000001, ${prefix}000002…` : "PAN000001, PAN000002…"
                  }`}
            </p>
          </div>
        </DialogBody>
        <DialogFooter align={editing && onDeactivate && category.is_active ? "between" : "end"}>
          {editing && onDeactivate && category.is_active ? (
            <Button type="button" variant="ghost" className="text-status-danger" onClick={() => onDeactivate(category)} disabled={saving}>
              Desactivar…
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar" : (submitLabel ?? "Crear categoría")}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
