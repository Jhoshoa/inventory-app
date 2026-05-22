"use client";

import { useActionState, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  const [createState, createAction, isCreating] = useActionState(createProductCategoryAction, initialState);
  const [deactivateState, deactivateAction, isDeactivating] = useActionState(deactivateProductCategoryAction, initialState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const message = createState.ok ? createState.message : deactivateState.ok ? deactivateState.message : null;
    if (!message) return;
    setToastMessage(message);
    const timeout = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [createState.message, createState.ok, deactivateState.message, deactivateState.ok]);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage(null)} /> : null}

      <div>
        <h2 className="text-base font-semibold text-slate-950">Categorias de productos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configura prefijos para generar SKUs como COM000001.
        </p>
      </div>

      {createState.message && !createState.ok ? <Alert variant="error">{createState.message}</Alert> : null}
      {deactivateState.message && !deactivateState.ok ? (
        <Alert variant="error">{deactivateState.message}</Alert>
      ) : null}

      <form action={createAction} className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="category-name">Nombre</Label>
          <Input id="category-name" name="name" error={Boolean(createState.fieldErrors.name)} />
          <FieldError message={createState.fieldErrors.name} />
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
          <FieldError message={createState.fieldErrors.sku_prefix} />
        </div>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Creando..." : "Crear categoria"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Prefijo SKU</th>
              <th className="px-4 py-3">Siguiente SKU</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {categories.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  Sin categorias configuradas.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">{category.name}</td>
                  <td className="px-4 py-3 text-slate-700">{category.sku_prefix}</td>
                  <td className="px-4 py-3 text-slate-700">{formatNextSku(category)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={category.is_active ? "success" : "default"}>
                      {category.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {category.is_active ? (
                      <form action={deactivateAction}>
                        <input type="hidden" name="category_id" value={category.id} />
                        <Button type="submit" variant="ghost" disabled={isDeactivating}>
                          Desactivar
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
    </section>
  );
}

function formatNextSku(category: ProductCategory) {
  return `${category.sku_prefix}${category.next_sku_number.toString().padStart(6, "0")}`;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-20 z-50 flex max-w-sm items-center gap-3 rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        className="rounded px-1 text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        onClick={onClose}
        aria-label="Cerrar notificacion"
      >
        x
      </button>
    </div>
  );
}
