"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  createProductCategoryAction,
  deactivateProductCategoryAction,
} from "../actions";
import type { ProductCategory, ProductCategoryActionState } from "../types";

const initialState: ProductCategoryActionState = { ok: false, fieldErrors: {} };

export function ProductCategorySettings({ categories }: { categories: ProductCategory[] }) {
  const [createState, setCreateState] = useState<ProductCategoryActionState>(initialState);
  const [deactivateState, setDeactivateState] = useState<ProductCategoryActionState>(initialState);
  const [isCreating, setIsCreating] = useState(false);
  const [deactivatingCategoryId, setDeactivatingCategoryId] = useState<string | null>(null);
  const [visibleCategories, setVisibleCategories] = useState(categories);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);

  function showToast(message?: string) {
    if (!message) return;
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  }

  async function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    setCreateState(initialState);
    try {
      const nextState = await createProductCategoryAction(initialState, new FormData(event.currentTarget));
      setCreateState(nextState);
      if (nextState.ok && nextState.category) {
        setVisibleCategories((current) => upsertCategory(current, nextState.category as ProductCategory));
        createFormRef.current?.reset();
        showToast(nextState.message);
      }
    } catch (error) {
      setCreateState({
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo crear la categoria.",
        fieldErrors: {},
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function onDeactivateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const categoryId = formData.get("category_id");
    if (typeof categoryId !== "string" || !categoryId || deactivatingCategoryId) return;

    setDeactivatingCategoryId(categoryId);
    setDeactivateState(initialState);
    try {
      const nextState = await deactivateProductCategoryAction(initialState, formData);
      setDeactivateState(nextState);
      if (nextState.ok && nextState.category) {
        setVisibleCategories((current) => upsertCategory(current, nextState.category as ProductCategory));
        showToast(nextState.message);
      }
    } catch (error) {
      setDeactivateState({
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo desactivar la categoria.",
        fieldErrors: {},
      });
    } finally {
      setDeactivatingCategoryId(null);
    }
  }

  return (
    <CollapsibleSection
      title="Categorias de productos"
      description="Configura prefijos para generar SKUs como COM000001."
    >
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage(null)} /> : null}

      {createState.message && !createState.ok ? <Alert variant="error">{createState.message}</Alert> : null}
      {deactivateState.message && !deactivateState.ok ? (
        <Alert variant="error">{deactivateState.message}</Alert>
      ) : null}

      <form
        ref={createFormRef}
        onSubmit={onCreateSubmit}
        className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-start"
      >
        <div className="space-y-2">
          <Label htmlFor="category-name">Nombre</Label>
          <Input id="category-name" name="name" error={Boolean(createState.fieldErrors.name)} />
          <div className="min-h-5">
            <FieldError message={createState.fieldErrors.name} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-prefix">Prefijo SKU</Label>
          <Input
            id="category-prefix"
            name="sku_prefix"
            maxLength={8}
            className="uppercase"
            error={Boolean(createState.fieldErrors.sku_prefix)}
          />
          <div className="min-h-5">
            <FieldError message={createState.fieldErrors.sku_prefix} />
          </div>
        </div>
        <Button type="submit" className="w-full md:mt-7" disabled={isCreating}>
          {isCreating ? "Creando..." : "Crear categoria"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-app-border">
        <table className="min-w-full divide-y divide-app-border text-sm">
          <thead className="bg-app-surface-muted text-left text-xs font-semibold uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Prefijo SKU</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border bg-app-surface">
            {visibleCategories.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-text-muted" colSpan={4}>
                  Sin categorias configuradas.
                </td>
              </tr>
            ) : (
              visibleCategories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3 font-medium text-text-strong">{category.name}</td>
                  <td className="px-4 py-3 text-text-body">{category.sku_prefix}</td>
                  <td className="px-4 py-3">
                    <Badge variant={category.is_active ? "success" : "default"}>
                      {category.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {category.is_active ? (
                      <form onSubmit={onDeactivateSubmit}>
                        <input type="hidden" name="category_id" value={category.id} />
                        <Button type="submit" variant="ghost" disabled={deactivatingCategoryId === category.id}>
                          {deactivatingCategoryId === category.id ? "Desactivando..." : "Desactivar"}
                        </Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

function upsertCategory(categories: ProductCategory[], category: ProductCategory) {
  const existing = categories.some((item) => item.id === category.id);
  const next = existing
    ? categories.map((item) => (item.id === category.id ? category : item))
    : [...categories, category];
  return next.toSorted((left, right) => {
    if (left.is_active !== right.is_active) return left.is_active ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-20 z-50 flex max-w-sm items-center gap-3 rounded-md border border-status-successBorder bg-app-surface px-4 py-3 text-sm font-medium text-status-success shadow-floating"
    >
      <span className="h-2 w-2 rounded-full bg-status-success" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        className="rounded px-1 text-status-success hover:bg-status-successBg focus:outline-none focus:ring-2 focus:ring-focus"
        onClick={onClose}
        aria-label="Cerrar notificacion"
      >
        x
      </button>
    </div>
  );
}
