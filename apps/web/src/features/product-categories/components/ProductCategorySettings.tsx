"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import {
  createProductCategoryAction,
  deactivateProductCategoryAction,
} from "../actions";
import type { ProductCategory, ProductCategoryActionState } from "../types";

const initialState: ProductCategoryActionState = { ok: false, fieldErrors: {} };

export function ProductCategorySettings({ categories }: { categories: ProductCategory[] }) {
  const [createState, setCreateState] = useState<ProductCategoryActionState>(initialState);
  const [isCreating, setIsCreating] = useState(false);
  const [deactivatingCategoryId, setDeactivatingCategoryId] = useState<string | null>(null);
  const router = useRouter();
  const [visibleCategories, setVisibleCategories] = useState(categories);
  const createFormRef = useRef<HTMLFormElement>(null);

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
        toast.success(nextState.message || "Categoria creada");
        router.refresh();
      } else if (!nextState.ok) {
        toast.error(nextState.message || "No se pudo crear la categoria");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la categoria.";
      setCreateState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
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
    try {
      const nextState = await deactivateProductCategoryAction(initialState, formData);
      if (nextState.ok && nextState.category) {
        setVisibleCategories((current) => upsertCategory(current, nextState.category as ProductCategory));
        toast.success(nextState.message || "Categoria desactivada");
        router.refresh();
      } else if (!nextState.ok) {
        toast.error(nextState.message || "No se pudo desactivar la categoria");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo desactivar la categoria.";
      toast.error(message);
    } finally {
      setDeactivatingCategoryId(null);
    }
  }

  return (
    <CollapsibleSection
      title="Categorias de productos"
      description="Configura prefijos para generar SKUs como COM000001."
    >
      <form
        ref={createFormRef}
        onSubmit={onCreateSubmit}
        className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-start"
      >
        <div className="space-y-2">
          <Label htmlFor="category-name">Nombre</Label>
          <Input id="category-name" name="name" maxLength={80} error={Boolean(createState.fieldErrors.name)} />
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

      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Nombre</TableHeaderCell>
            <TableHeaderCell>Prefijo SKU</TableHeaderCell>
            <TableHeaderCell>Estado</TableHeaderCell>
            <TableHeaderCell align="right">Accion</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {visibleCategories.length === 0 ? (
            <TableEmptyRow colSpan={4}>
              <EmptyState
                title="Sin categorias configuradas"
                description="Crea categorias para agrupar productos y generar SKUs consistentes desde el formulario superior."
                className="border-0 bg-transparent py-6 shadow-none"
              />
            </TableEmptyRow>
          ) : (
            visibleCategories.map((category) => (
              <TableRow key={category.id} tone={category.is_active ? "default" : "muted"}>
                <TableCell>
                  <TableText className="font-medium text-text-strong">{category.name}</TableText>
                </TableCell>
                <TableCell className="font-mono text-xs">{category.sku_prefix}</TableCell>
                <TableCell>
                  <Badge variant={category.is_active ? "success" : "default"}>
                    {category.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  {category.is_active ? (
                    <form onSubmit={onDeactivateSubmit}>
                      <input type="hidden" name="category_id" value={category.id} />
                      <TableActionGroup>
                        <Button type="submit" variant="ghost" disabled={deactivatingCategoryId === category.id}>
                          {deactivatingCategoryId === category.id ? "Desactivando..." : "Desactivar"}
                        </Button>
                      </TableActionGroup>
                    </form>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
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
