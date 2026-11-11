import type { SelectHTMLAttributes } from "react";

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-control w-full rounded-control border border-app-borderStrong bg-app-surface px-3 text-sm text-text-strong outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:bg-app-surface-muted disabled:text-text-disabled ${className}`}
      {...props}
    />
  );
}
