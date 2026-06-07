import { Inbox } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
}: {
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-app-borderStrong bg-app-surface px-6 py-10 text-center shadow-panel">
      <Inbox className="mx-auto h-8 w-8 text-text-disabled" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-text-strong">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted">
        {description}
      </p>
      {actionLabel ? (
        <Button className="mt-5" disabled>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
