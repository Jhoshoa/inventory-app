import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "./Button";

export function ForbiddenState({
  title = "Accion restringida",
  description = "Esta accion requiere permisos de owner.",
  actionHref = "/dashboard",
  actionLabel = "Volver al dashboard",
}: {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="rounded-lg border border-status-warningBorder bg-status-warningBg p-6" role="status">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ShieldAlert className="h-6 w-6 text-status-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-status-warning">{title}</h1>
          <p className="mt-1 text-sm text-status-warning">{description}</p>
          <Button className="mt-4" variant="secondary" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
