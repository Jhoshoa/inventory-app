import type { Metadata } from "next";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { CategoryManager } from "@/features/product-categories/components/CategoryManager";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Categorías" };

// Productos › Categorías (tablero P01B). Solo el dueño: la API también lo exige.
export default async function ProductCategoriesPage() {
  const session = await requireSession();
  if (!canManageProducts(session.role)) {
    return (
      <ForbiddenState
        description="Solo el dueño de la tienda puede ver y cambiar las categorías."
        actionHref="/dashboard/products"
        actionLabel="Volver a Productos"
      />
    );
  }

  const categories = await listProductCategories(true);
  return (
    <CategoryManager
      categories={categories.ok ? sortCategories(categories.data.items) : []}
      loadError={categories.ok ? null : categories.error.message}
    />
  );
}

/** Activas primero y por nombre; las desactivadas al final. */
function sortCategories<T extends { name: string; is_active: boolean }>(items: T[]) {
  return [...items].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, "es"),
  );
}
