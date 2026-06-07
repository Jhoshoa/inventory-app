"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format/currency";
import { canAddProduct } from "../schemas";
import type { PosProduct } from "../types";

export function PosProductResults({
  products,
  onAdd,
}: {
  products: PosProduct[];
  onAdd: (product: PosProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-app-borderStrong bg-app-surface-muted p-6 text-center text-sm text-text-muted">
        Sin productos para esta busqueda
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {products.map((product) => {
        const available = canAddProduct(product);
        return (
          <div
            key={product.id}
            className={`grid gap-3 rounded-lg border p-4 shadow-panel sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
              available
                ? "border-app-border bg-app-surface"
                : "border-status-dangerBorder bg-status-dangerBg/40"
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-medium text-text-strong">{product.name}</h3>
                <Badge variant={available ? "success" : "danger"}>
                  {available ? `${product.stock} ${product.unit}` : "Sin stock"}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-text-strong">{formatCurrency(product.price)}</span>
                <span className="text-text-muted">Codigo {product.qr_code ?? "sin codigo"}</span>
              </div>
            </div>
            <Button onClick={() => onAdd(product)} disabled={!available}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar
            </Button>
          </div>
        );
      })}
    </div>
  );
}
