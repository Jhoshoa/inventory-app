"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { setImportItemStatusAction } from "../actions";
import { importItemToFormValues, isImportEditable } from "../schemas";
import type { ImportActionState, InventoryImport, InventoryImportItem } from "../types";
import { ImportItemEditor } from "./ImportItemEditor";
import { ImportItemStatusBadge } from "./ImportStatusBadge";

const initialState: ImportActionState = { ok: false, fieldErrors: {} };

export function ImportReviewTable({ inventoryImport }: { inventoryImport: InventoryImport }) {
  const editable = isImportEditable(inventoryImport.status);

  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>Fila</TableHeaderCell>
          <TableHeaderCell>Producto</TableHeaderCell>
          <TableHeaderCell>Precio</TableHeaderCell>
          <TableHeaderCell>Stock</TableHeaderCell>
          <TableHeaderCell>Confianza</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {inventoryImport.items.length === 0 ? (
          <TableEmptyRow colSpan={7}>Sin items detectados</TableEmptyRow>
        ) : (
          inventoryImport.items.map((item) => (
            <ImportReviewRow key={item.id} item={item} editable={editable} />
          ))
        )}
      </tbody>
    </Table>
  );
}

function ImportReviewRow({ item, editable }: { item: InventoryImportItem; editable: boolean }) {
  const values = importItemToFormValues(item);
  return (
    <tr className="border-t border-slate-100">
      <TableCell>{item.row_number}</TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-slate-950">{item.name || "Sin nombre"}</p>
          <p className="text-xs text-slate-500">{item.category ?? "Sin categoria"} · {item.unit}</p>
          {item.product_id ? (
            <Link className="text-xs font-medium text-slate-700 underline" href={`/dashboard/products/${item.product_id}`}>
              Producto creado
            </Link>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{item.price}</TableCell>
      <TableCell>{item.stock}</TableCell>
      <TableCell>{item.confidence ? `${Math.round(Number(item.confidence) * 100)}%` : "N/A"}</TableCell>
      <TableCell><ImportItemStatusBadge status={item.status} /></TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <ImportItemEditor item={item} disabled={!editable} />
          <StatusForm values={values} status="approved" disabled={!editable} label="Aprobar" />
          <StatusForm values={values} status="rejected" disabled={!editable} label="Rechazar" />
        </div>
      </TableCell>
    </tr>
  );
}

function StatusForm({
  values,
  status,
  disabled,
  label,
}: {
  values: ReturnType<typeof importItemToFormValues>;
  status: "approved" | "rejected";
  disabled: boolean;
  label: string;
}) {
  const [, formAction, isPending] = useActionState(setImportItemStatusAction, initialState);

  return (
    <form action={formAction}>
      {Object.entries({ ...values, status }).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button variant={status === "approved" ? "primary" : "ghost"} type="submit" disabled={disabled || isPending}>
        {status === "approved" ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
        {label}
      </Button>
    </form>
  );
}
