import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format/currency";
import { ProductStockDialog } from "./ProductStockDialog";
import { StockBadge } from "./ProductTable";
import type { Product } from "../types";

export function ProductDetail({ product }: { product: Product }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Detalle operativo, codigos y auditoria de stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/products/${product.id}/edit`}>Editar</Link>
          </Button>
          <ProductStockDialog productId={product.id} productName={product.name} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Precio" value={formatCurrency(product.price)} />
        <InfoCard label="Stock" value={`${product.stock} ${product.unit}`} />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Estado</p>
          <div className="mt-3">
            <StockBadge product={product} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-950">Datos</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="SKU" value={product.sku ?? "Sin SKU"} />
            <Row label="QR" value={product.qr_code ?? "Sin QR"} />
            <Row label="Categoria" value={product.category ?? "Sin categoria"} />
            <Row label="Stock minimo" value={product.min_stock.toString()} />
            <Row label="Costo" value={product.cost_price ? formatCurrency(product.cost_price) : "Sin costo"} />
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-950">Visibilidad</h2>
          <div className="mt-4">
            <Badge variant={product.is_active ? "success" : "default"}>
              {product.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-950">{value}</dd>
    </div>
  );
}
