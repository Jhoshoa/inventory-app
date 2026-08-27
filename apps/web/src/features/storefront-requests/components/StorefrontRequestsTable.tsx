"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateTimeShort } from "@/lib/format/datetime";
import { storefrontWhatsappHref } from "@/features/storefront/whatsapp";
import { updateStorefrontRequestPaymentAction, updateStorefrontRequestStatusAction } from "../actions";
import type { StorefrontRequestResponse, StorefrontRequestStatus } from "../types";

const STATUS_LABELS: Record<StorefrontRequestStatus, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  closed: "Cerrado",
};

const STATUS_VARIANTS: Record<StorefrontRequestStatus, "default" | "success" | "warning"> = {
  pending: "warning",
  contacted: "default",
  closed: "success",
};

export function StorefrontRequestsTable({ requests }: { requests: StorefrontRequestResponse[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function updateStatus(request: StorefrontRequestResponse, status: StorefrontRequestStatus) {
    setPendingId(request.id);
    startTransition(async () => {
      const result = await updateStorefrontRequestStatusAction(request.id, status);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setPendingId(null);
    });
  }

  function togglePayment(request: StorefrontRequestResponse) {
    setPendingId(request.id);
    startTransition(async () => {
      const result = await updateStorefrontRequestPaymentAction(request.id, !request.payment_confirmed);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setPendingId(null);
    });
  }

  return (
    <Table wrapperClassName="w-full">
      <thead>
        <tr>
          <TableHeaderCell>Producto</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Pago</TableHeaderCell>
          <TableHeaderCell>Recibido</TableHeaderCell>
          <TableHeaderCell align="right">Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {requests.length === 0 ? (
          <TableEmptyRow colSpan={6}>Todavia no llegaron solicitudes desde tu catalogo publico.</TableEmptyRow>
        ) : (
          requests.map((request) => {
            const rowPending = isPending && pendingId === request.id;
            return (
              <TableRow key={request.id}>
                <TableCell mobileLabel="Producto">
                  <p className="truncate text-text-strong">{request.product_name}</p>
                </TableCell>
                <TableCell mobileLabel="Cliente">
                  <p className="truncate text-text-strong">{request.customer_name}</p>
                  <p className="truncate text-xs text-text-muted">{request.customer_phone}</p>
                  {request.note ? (
                    <p className="mt-1 truncate text-xs text-text-muted" title={request.note}>
                      &ldquo;{request.note}&rdquo;
                    </p>
                  ) : null}
                </TableCell>
                <TableCell mobileLabel="Estado">
                  <Badge variant={STATUS_VARIANTS[request.status]}>{STATUS_LABELS[request.status]}</Badge>
                </TableCell>
                <TableCell mobileLabel="Pago">
                  <Badge variant={request.payment_confirmed ? "success" : "default"}>
                    {request.payment_confirmed ? "Confirmado" : "Pendiente"}
                  </Badge>
                </TableCell>
                <TableCell mobileLabel="Recibido">
                  <span className="text-xs text-text-muted">{formatDateTimeShort(request.created_at)}</span>
                </TableCell>
                <TableCell align="right">
                  <TableActionGroup>
                    <a
                      href={storefrontWhatsappHref(
                        request.customer_phone,
                        `Hola ${request.customer_name}, te contacto por tu consulta de "${request.product_name}"`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-status-success px-4 text-sm font-medium text-text-inverse shadow-sm hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      WhatsApp
                    </a>
                    {request.status !== "contacted" ? (
                      <Button
                        variant="ghost"
                        disabled={rowPending}
                        onClick={() => updateStatus(request, "contacted")}
                      >
                        Marcar contactado
                      </Button>
                    ) : null}
                    {request.status !== "closed" ? (
                      <Button variant="ghost" disabled={rowPending} onClick={() => updateStatus(request, "closed")}>
                        Cerrar
                      </Button>
                    ) : null}
                    <Button variant="ghost" disabled={rowPending} onClick={() => togglePayment(request)}>
                      {request.payment_confirmed ? "Desmarcar pago" : "Marcar pagado"}
                    </Button>
                  </TableActionGroup>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </tbody>
    </Table>
  );
}
