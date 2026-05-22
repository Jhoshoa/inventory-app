import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { ProductForm } from "@/features/products/components/ProductForm";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function NewProductPage() {
  const session = await requireSession();
  if (!canManageProducts(session.role)) {
    return <ForbiddenState description="Crear productos requiere permisos de owner." />;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Nuevo producto</h1>
          <p className="mt-1 text-sm text-slate-600">
            Registra datos basicos, precio y stock inicial.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/products">Volver</Link>
        </Button>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <ProductForm mode="create" />
      </div>
    </section>
  );
}
