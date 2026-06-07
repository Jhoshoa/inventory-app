import Link from "next/link";
import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({
  action,
  actionHref,
  title,
  description,
  actionLabel,
  className,
  icon: Icon = Inbox,
  secondaryAction,
  tone = "default",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  icon?: LucideIcon;
  secondaryAction?: ReactNode;
  tone?: "default" | "warning";
}) {
  const toneClasses = {
    default: "border-app-borderStrong bg-app-surface",
    warning: "border-status-warningBorder bg-status-warningBg",
  }[tone];

  return (
    <div className={`rounded-lg border border-dashed px-6 py-10 text-center shadow-panel ${toneClasses} ${className ?? ""}`}>
      <Icon className="mx-auto h-8 w-8 text-text-disabled" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-text-strong">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted">
        {description}
      </p>
      {action || (actionLabel && actionHref) || secondaryAction ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {action ? action : null}
          {!action && actionLabel && actionHref ? (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : null}
          {secondaryAction ? secondaryAction : null}
        </div>
      ) : null}
    </div>
  );
}
