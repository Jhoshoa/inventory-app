import { PageSection } from "@/components/layout/PageSection";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

export function ProductTableSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando productos">
      <PageHeader
        eyebrow="Inventario"
        title="Productos"
        description="Busca, filtra y administra el inventario de la tienda."
        actions={
          <div className="flex gap-2">
            <div className="h-9 w-40 animate-pulse rounded-md bg-app-surface-muted" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-app-surface-muted" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-app-surface-muted" />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-64 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-9 w-44 animate-pulse rounded-md bg-app-surface-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-app-surface-muted" />
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface">
        <Table>
          <thead>
            <tr>
              {["Producto", "SKU", "Categoria", "Precio", "Stock", "Estado", "Acciones"].map(
                (header) => (
                  <TableHeaderCell key={header}>{header}</TableHeaderCell>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 7 }, (_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <span
                      className={`block h-4 animate-pulse rounded bg-app-surface-muted ${
                        cellIndex === 0 ? "w-36" : cellIndex === 1 ? "w-20" : cellIndex === 4 ? "w-12" : "w-16"
                      }`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="h-4 w-48 animate-pulse rounded bg-app-border" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-8 w-8 animate-pulse rounded-md bg-app-surface-muted"
            />
          ))}
        </div>
      </div>
    </PageSection>
  );
}
