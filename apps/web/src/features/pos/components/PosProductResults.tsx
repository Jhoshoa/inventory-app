"use client";

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
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
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
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-slate-950">{product.name}</h3>
                <Badge variant={available ? "success" : "danger"}>
                  {available ? `${product.stock} ${product.unit}` : "Sin stock"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {formatCurrency(product.price)} - QR {product.qr_code ?? "sin codigo"}
              </p>
            </div>
            <Button onClick={() => onAdd(product)} disabled={!available}>
              Agregar
            </Button>
          </div>
        );
      })}
    </div>
  );
}
