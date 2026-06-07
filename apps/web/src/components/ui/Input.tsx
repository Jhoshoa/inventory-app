import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", error = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`h-10 w-full rounded-md border bg-app-surface px-3 text-sm text-text-strong outline-none transition-colors placeholder:text-text-disabled focus:border-brand-600 focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:bg-app-surface-muted disabled:text-text-disabled ${
        error ? "border-status-danger" : "border-app-borderStrong"
      } ${className}`}
      {...props}
    />
  );
});
