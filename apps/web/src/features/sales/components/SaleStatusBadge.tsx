import { Badge } from "@/components/ui/Badge";
import type { Sale } from "../types";

export function SaleStatusBadge({ status, className }: { status: Sale["status"]; className?: string }) {
  if (status === "completed") return <Badge variant="success" className={className}>Completada</Badge>;
  if (status === "voided") return <Badge variant="danger" className={className}>Anulada</Badge>;
  return <Badge className={className}>{status}</Badge>;
}
