"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductsSubpageHeader } from "@/features/products/components/ProductsSubpageHeader";
import { deactivateProductCategoryAction } from "../actions";
import { nextSku } from "../schemas";
import type { ProductCategory } from "../types";
import { CategoryDialog } from "./CategoryDialog";

/**
 * Productos › Categorías (tablero P01B). Las categorías no se borran: se desactivan
 * y dejan de aparecer al crear productos (la API no tiene "volver a activar").
 */
export function CategoryManager({
  categories,
  loadError = null,
}: {
  categories: ProductCategory[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ category: ProductCategory | null } | null>(null);
  const [deactivating, setDeactivating] = useState<ProductCategory | null>(null);
  const active = categories.filter((category) => category.is_active).length;

  const newButton = (
    <Button onClick={() => setDialog({ category: null })}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Nueva categoría
    </Button>
  );

  async function deactivate(category: ProductCategory) {
    const result = await deactivateProductCategoryAction(category.id);
    if (!result.ok) {
      toast.error(result.message ?? "No se pudo desactivar la categoría");
      throw new Error(result.message);
    }
    toast.success(`"${category.name}" desactivada`);
    setDeactivating(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3.5 pb-4">
      <ProductsSubpageHeader
        title="Categorías"
        summary={loadError ? null : summaryLine(categories.length, active)}
        action={loadError ? null : newButton}
      />

      {loadError ? (
        <DataFetchError resource="las categorías" error={loadError} onRetry={() => router.refresh()} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Crea tu primera categoría para tener SKU automático"
          description="Cada categoría tiene un prefijo: los productos nuevos quedan como LAC000001, LAC000002…"
          action={newButton}
        />
      ) : (
        <>
          <p className="text-sm text-text-muted">
            El prefijo arma el SKU automático (LAC000001).
            <span className="max-md:hidden"> Si el producto se crea sin SKU, se usa el próximo número.</span>
          </p>

          <ul className="flex flex-col gap-2 md:hidden" aria-label="Categorías">
            {categories.map((category) => (
              <li
                key={category.id}
                className={`flex items-center gap-3 rounded-[14px] border border-app-border bg-app-surface px-3.5 py-3 ${
                  category.is_active ? "" : "bg-app-surface-muted"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <strong className={`truncate text-[15px] ${category.is_active ? "text-text-strong" : "text-text-muted"}`}>
                      {category.name}
                    </strong>
                    {category.is_active ? null : <Badge variant="default">Desactivada</Badge>}
                  </p>
                  <p className="text-xs text-text-muted">
                    Prefijo {category.sku_prefix} · próximo {nextSku(category)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="!h-9 shrink-0 !px-3 text-[13px]"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => setDialog({ category })}
                >
                  Editar
                </Button>
              </li>
            ))}
          </ul>

          <div className="overflow-hidden rounded-card border border-app-border bg-app-surface max-md:hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-app-surface-muted text-left text-xs font-semibold text-text-muted">
                  <th scope="col" className="px-3 py-2.5">Categoría</th>
                  <th scope="col" className="px-3 py-2.5">Prefijo</th>
                  <th scope="col" className="px-3 py-2.5">Próximo SKU</th>
                  <th scope="col" className="px-3 py-2.5">Estado</th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t border-app-border">
                    <td className={`px-3 py-2.5 font-bold ${category.is_active ? "text-text-strong" : "text-text-muted"}`}>
                      {category.name}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-text-body">{category.sku_prefix}</td>
                    <td className="px-3 py-2.5 font-mono text-text-muted">{nextSku(category)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={category.is_active ? "success" : "default"}>
                        {category.is_active ? "Activa" : "Desactivada"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <div className="inline-flex gap-1.5">
                        <Button
                          variant="secondary"
                          className="!h-[34px] rounded-[10px] !px-2.5 text-[13px]"
                          aria-label={`Editar ${category.name}`}
                          onClick={() => setDialog({ category })}
                        >
                          Editar
                        </Button>
                        {category.is_active ? (
                          <Button
                            variant="ghost"
                            className="!h-[34px] rounded-[10px] !px-2.5 text-[13px] text-status-danger"
                            aria-label={`Desactivar ${category.name}`}
                            onClick={() => setDeactivating(category)}
                          >
                            Desactivar
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-muted">
            Las desactivadas no aparecen al crear productos; los productos que ya la tienen la conservan.
          </p>
          <Button className="w-full !h-[52px] md:hidden" onClick={() => setDialog({ category: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva categoría
          </Button>
        </>
      )}

      <CategoryDialog
        open={dialog !== null}
        category={dialog?.category ?? null}
        onOpenChange={(open) => !open && setDialog(null)}
        onSaved={() => {
          setDialog(null);
          router.refresh();
        }}
        onDeactivate={(category) => {
          setDialog(null);
          setDeactivating(category);
        }}
      />
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={deactivating ? `¿Desactivar "${deactivating.name}"?` : "Desactivar categoría"}
        description="Deja de aparecer al crear productos. Los productos que ya la tienen la conservan. No se puede volver a activar."
        confirmLabel="Desactivar"
        pendingLabel="Desactivando…"
        onConfirm={() => (deactivating ? deactivate(deactivating) : undefined)}
      />
    </div>
  );
}

function summaryLine(total: number, active: number) {
  if (total === 0) return "Sin categorías todavía";
  const count = total === 1 ? "1 categoría" : `${total} categorías`;
  return active === total ? count : `${count} · ${active === 1 ? "1 activa" : `${active} activas`}`;
}
