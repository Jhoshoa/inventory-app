import { Badge } from "@/components/ui/Badge";
import { STATUS_LABEL } from "../list";
import type { StorefrontRequestStatus } from "../types";

const STATUS_VARIANT: Record<StorefrontRequestStatus, "warning" | "info" | "default"> = {
  pending: "warning",
  contacted: "info",
  closed: "default",
};

export function OrderStatusBadge({ status, className }: { status: StorefrontRequestStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={`whitespace-nowrap ${className ?? ""}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function OrderPaymentBadge({ paid, className }: { paid: boolean; className?: string }) {
  return (
    <Badge variant={paid ? "success" : "default"} className={`whitespace-nowrap ${className ?? ""}`}>
      {paid ? "Pagado" : "Sin pago"}
    </Badge>
  );
}
