import { Badge } from "@/components/ui/Badge";
import { importStatusLabel, itemStatusLabel } from "../schemas";

export function ImportStatusBadge({ status }: { status: string }) {
  return <Badge variant={variantForImport(status)}>{importStatusLabel(status)}</Badge>;
}

export function ImportItemStatusBadge({ status }: { status: string }) {
  return <Badge variant={variantForItem(status)}>{itemStatusLabel(status)}</Badge>;
}

function variantForImport(status: string) {
  if (status === "confirmed") return "success";
  if (status === "failed") return "danger";
  if (status === "needs_review" || status === "processing" || status === "pending") return "warning";
  return "default";
}

function variantForItem(status: string) {
  if (status === "approved" || status === "imported") return "success";
  if (status === "rejected" || status === "failed") return "danger";
  return "default";
}
