import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-md border border-app-borderStrong bg-app-surface px-3 py-2 text-sm text-text-strong outline-none transition-colors placeholder:text-text-disabled focus:border-brand-600 focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:bg-app-surface-muted disabled:text-text-disabled ${className}`}
      {...props}
    />
  );
}
