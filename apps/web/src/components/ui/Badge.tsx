import type { HTMLAttributes } from "react";

const variants = {
  default: "border-app-border bg-app-surface-muted text-text-body",
  success: "border-status-successBorder bg-status-successBg text-status-success",
  warning: "border-status-warningBorder bg-status-warningBg text-status-warning",
  danger: "border-status-dangerBorder bg-status-dangerBg text-status-danger",
  info: "border-status-infoBorder bg-status-infoBg text-status-info",
} as const;

export function Badge({
  className = "",
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
